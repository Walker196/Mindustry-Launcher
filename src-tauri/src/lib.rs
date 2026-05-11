
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use lazy_static::lazy_static;


use std::time::Duration;

lazy_static! {
    static ref CANCEL_FLAGS: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>> = Arc::new(Mutex::new(HashMap::new()));
}

use tauri::ipc::Channel;
use futures_util::StreamExt;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct JdkInfo {
    version: String,
    path: String,
    source: String
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct GithubRelease {
    tag_name: String,
    prerelease: bool,
    published_at: String,
    body: String,
    assets: Vec<GithubAsset>
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct GithubAsset {
    name: String,
    browser_download_url: String
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct GameVersion {
    version: String,
    published_at: String,
    download_url: String,
    server_download_url: Option<String>,
    has_server: bool,
    body: String,
    prerelease: bool
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct VersionCache {
    versions: Vec<GameVersion>,
    last_updated: String
}

#[derive(serde::Serialize)]
struct InstalledVersion {
    version: String,
    has_game: bool,
    has_server: bool
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct BeVersion {
    version: String,
    published_at: String,
    download_url: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct BeVersionCache {
    versions: Vec<BeVersion>,
    last_updated: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct JavaConfig {
    jdks: Vec<JdkInfo>,
    selected_path: Option<String>
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct PlayRecord {
    version: String,
    timestamp: String
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ModInfo {
    name: String,
    display_name: String,
    author: String,
    description: String,
    repo: String,
    stars: u32,
    last_updated: String
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ModVersion {
    tag_name: String,
    published_at: String,
    assets: Vec<ModAsset>
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ModAsset {
    name: String,
    browser_download_url: String,
    content_type: String,
    size: u64
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct ModCache {
    mods: Vec<ModInfo>,
    last_updated: String
}

macro_rules! debug_print {
    ($($arg:tt)*) => {
        #[cfg(debug_assertions)]
        {
            println!($($arg)*);
        }
    };
}

fn get_java_version(java_home: &str) -> String {
    let java_exe = format!("{}/bin/java", java_home);
    if let Ok(output) = Command::new(&java_exe).arg("-version").output() {
        let stdout = String::from_utf8_lossy(&output.stderr);
        return parse_version(&stdout);
    }
    "未知版本".to_string()
}

fn find_java_in_path() -> Option<String> {
    if let Ok(output) = Command::new("where").arg("java").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = stdout.lines().next() {
            let path = std::path::Path::new(line);
            if let Some(parent) = path.parent() {
                if let Some(grandparent) = parent.parent() {
                    return Some(grandparent.display().to_string());
                }
            }
        }
    }
    None
}

fn parse_version(output: &str) -> String {
    for line in output.lines() {
        if line.contains("version") {
            let parts: Vec<&str> = line.split('"').collect();
            if parts.len() >= 2 {
                return parts[1].to_string();
            }
        }
    }
    "未知版本".to_string()
}

#[tauri::command]
fn detect_jdks() -> Vec<JdkInfo> {
    let mut jdks: Vec<JdkInfo> = Vec::new();
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let version = get_java_version(&java_home);
        jdks.push(JdkInfo {
            version,
            path: java_home,
            source: "JAVA_HOME".to_string()
        });
    }
    if let Ok(output) = Command::new("java").arg("-version").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stderr);
            if let Some(path) = find_java_in_path() {
                jdks.push(JdkInfo {
                    version: parse_version(&stdout),
                    path,
                    source: "PATH".to_string()
                });
            }
        }
    }

    let common_dirs = vec![
        "C:/Program Files/Java",
        "C:/Program Files (x86)/Java",
        "C:/Program Files/Eclipse Adoptium",
        "C:/Program Files/Amazon Corretto"
    ];

    for dir in common_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(name) = path.file_name() {
                        let name_str = name.to_string_lossy();
                        if name_str.contains("jdk") || name_str.contains("java") {
                            let version = get_java_version(&path.display().to_string());
                            if !jdks.iter().any(|j| j.path == path.display().to_string()) {
                                jdks.push(JdkInfo {
                                    version,
                                    path: path.display().to_string(),
                                    source: "扫描目录".to_string()
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    jdks
}

#[tauri::command]
fn detect_and_save_jdks() -> JavaConfig {
    let jdks = detect_jdks();
    let mut config = load_java_config();
    
    for jdk in &jdks {
        if !config.jdks.iter().any(|j| j.path == jdk.path) {
            config.jdks.push(jdk.clone());
        }
    }
    
    if config.selected_path.is_none() && !config.jdks.is_empty() {
        config.selected_path = Some(config.jdks[0].path.clone());
    }
    
    save_java_config(&config);
    config
}

#[tauri::command]
fn load_java_config_cmd() -> JavaConfig {
    let mut config = load_java_config();
    
    
    if let Some(ref selected) = config.selected_path {
        if !verify_java_path(selected) {
            println!("[Java]选中的Java路径已失效:{}", selected);
            config.selected_path = None;
            save_java_config(&config);
        }
    }
    
    config
}

#[tauri::command]
fn select_java(path: String) -> Result<JavaConfig, String> {
    if !verify_java_path(&path) {
        return Err("所选 Java 路径无效".to_string());
    }
    let mut config = load_java_config();
    config.selected_path = Some(path.clone());
    save_java_config(&config);
    Ok(config)
}

fn get_app_data_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let data_dir = exe_dir.join("Data");
    fs::create_dir_all(&data_dir).ok();
    data_dir
}

fn load_java_config() -> JavaConfig {
    let config_path = get_app_data_dir().join("java_config.json");
    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<JavaConfig>(&content) {
            return config;
        }
    }
    JavaConfig {
        jdks: Vec::new(),
        selected_path: None
    }
}

fn save_java_config(config: &JavaConfig) {
    let config_path = get_app_data_dir().join("java_config.json");
    if let Ok(json) = serde_json::to_string_pretty(config) {
        fs::write(&config_path, json).ok();
    }
}

fn verify_java_path(path: &str) -> bool {

    let p = std::path::Path::new(path);
    if p.extension().map_or(false, |ext| ext == "exe") || p.ends_with("java") {
        return p.exists();
    }

    let java_exe = std::path::PathBuf::from(format!("{}/bin/java.exe", path));
    if java_exe.exists() {
        return true;
    }
    let java_unix = std::path::PathBuf::from(format!("{}/bin/java", path));
    java_unix.exists()
}

fn load_version_cache() -> Option<Vec<GameVersion>> {
    let cache_path = get_app_data_dir().join("versions_cache.json");
    if let Ok(content) = fs::read_to_string(&cache_path) {
        if let Ok(cache) =serde_json::from_str::<VersionCache>(&content) {
            debug_print!("[缓存] 已加载{}个版本", cache.versions.len());
            return Some(cache.versions);
        }
    }
    None
}

fn save_version_cache(versions: &[GameVersion]) {
    let cache_path = get_app_data_dir().join("versions_cache.json");
    let now = chrono::Utc::now().to_rfc3339();
    let cache = VersionCache {
        versions: versions.to_vec(),
        last_updated: now,
    };
    if let Ok(json) = serde_json::to_string_pretty(&cache) {
        fs::write(&cache_path, json).ok();
        debug_print!("[缓存] 已保存{}个版本到{:?}", cache.versions.len(), cache_path);
    }
}

#[allow(unused_assignments)]
fn fetch_versions_incremental_and_save() {

    let mut cached = load_version_cache().unwrap_or_default();
    let mut existing_tags: std::collections::HashSet<String> = cached.iter()
        .map(|v| v.version.clone())
        .collect();

    let client = reqwest::blocking::Client::builder()
        .user_agent("MindustryLauncher/1.0")
        .timeout(Duration::from_secs(20))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[版本增量] 创建客户端失败: {}", e);
            return;
        }
    };

    let mut page = 1;
    loop {
        let url = format!(
            "https://api.github.com/repos/Anuken/Mindustry/releases?per_page=100&page={}",
            page
        );
        debug_print!("[版本增量] 正在获取第 {} 页...", page);
        let response = match client
            .get(&url)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[版本增量] 第 {} 页请求失败: {}", page, e);
                break;
            }
        };

        if !response.status().is_success() {
            eprintln!("[版本增量] 第 {} 页返回错误: {}", page, response.status());
            break;
        }

        let releases: Vec<GithubRelease> = match response.json() {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[版本增量] 第 {} 页 JSON 解析失败: {}", page, e);
                break;
            }
        };

        if releases.is_empty() {
            debug_print!("[版本增量] 第 {} 页为空，停止翻页", page);
            break;
        }

        if let Some(first) = releases.first() {
            if existing_tags.contains(&first.tag_name) {
                debug_print!("[版本增量] 发现已缓存版本 {}，停止翻页", first.tag_name);
                break;
            }
        }

        let mut new_count = 0;
        for release in &releases {
            if existing_tags.contains(&release.tag_name) {
                continue;
            }
            let jar_asset = release.assets.iter().find(|a| {
                let name = &a.name;
                name.ends_with(".jar")
                    && !name.contains("server")
                    && (name.contains("Mindustry") || name.contains("desktop-release"))
            });
            let server_asset = release.assets.iter().find(|a| {
                let name = &a.name;
                name.ends_with(".jar") && (name.contains("server") || name.contains("server-release"))
            });

            if let Some(jar) = jar_asset {
                let gv = GameVersion {
                    version: release.tag_name.clone(),
                    published_at: release.published_at.clone(),
                    download_url: jar.browser_download_url.clone(),
                    server_download_url: server_asset.map(|s| s.browser_download_url.clone()),
                    has_server: server_asset.is_some(),
                    body: release.body.clone(),
                    prerelease: release.prerelease,
                };
                existing_tags.insert(gv.version.clone());
                cached.push(gv);
                new_count += 1;
            }
        }

        debug_print!("[版本增量] 第 {} 页新增 {} 个版本", page, new_count);

        save_version_cache(&cached);

        page += 1;
        std::thread::sleep(Duration::from_millis(500));
    }

    debug_print!("[版本增量] 增量更新完成，当前总版本 {}", cached.len());
}


fn save_be_versions_cache(versions: &[BeVersion]) {
    let cache_path = get_app_data_dir().join("be_versions_cache.json");
    let cache = BeVersionCache {
        versions: versions.to_vec(),
        last_updated: chrono::Utc::now().to_rfc3339(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&cache) {
        std::fs::write(&cache_path, json).ok();
    }
}

fn load_be_versions_cache() -> Option<Vec<BeVersion>> {
    let cache_path = get_app_data_dir().join("be_versions_cache.json");
    if let Ok(content) = std::fs::read_to_string(&cache_path) {
        if let Ok(cache) = serde_json::from_str::<BeVersionCache>(&content) {
            debug_print!("[BE缓存] 已加载 {} 个版本", cache.versions.len());
            return Some(cache.versions);
        }
    }
    None
}

#[allow(unused_assignments)]
fn fetch_be_incremental_and_save() {
    let mut cached = load_be_versions_cache().unwrap_or_default();
    let mut existing_tags: std::collections::HashSet<String> = cached.iter()
        .map(|v| v.version.clone())
        .collect();

    let client = reqwest::blocking::Client::builder()
        .user_agent("MindustryLauncher/1.0")
        .timeout(Duration::from_secs(20))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[BE增量] 创建客户端失败: {}", e);
            return;
        }
    };

    let mut page = 1;
    loop {
        let url = format!(
            "https://api.github.com/repos/Anuken/MindustryBuilds/releases?per_page=100&page={}",
            page
        );
        debug_print!("[BE增量] 正在获取第 {} 页...", page);
        let response = match client
            .get(&url)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[BE增量] 第 {} 页请求失败: {}", page, e);
                break;
            }
        };

        if !response.status().is_success() {
            eprintln!("[BE增量] 第 {} 页返回错误: {}", page, response.status());
            break;
        }

        #[derive(serde::Deserialize)]
        struct Release {
            tag_name: String,
            published_at: String,
            assets: Vec<Asset>,
        }
        #[derive(serde::Deserialize)]
        struct Asset {
            name: String,
            browser_download_url: String,
        }

        let releases: Vec<Release> = match response.json() {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[BE增量] 第 {} 页 JSON 解析失败: {}", page, e);
                break;
            }
        };

        if releases.is_empty() {
            debug_print!("[BE增量] 第 {} 页为空，停止翻页", page);
            break;
        }

        if let Some(first) = releases.first() {
            if existing_tags.contains(&first.tag_name) {
                debug_print!("[BE增量] 发现已缓存版本 {}，停止翻页", first.tag_name);
                break;
            }
        }

        let mut new_count = 0;
        for release in &releases {
            if existing_tags.contains(&release.tag_name) {
                continue;
            }
            if let Some(asset) = release.assets.iter().find(|a| {
                a.name.contains("Desktop") && a.name.ends_with(".jar")
            }) {
                let version = BeVersion {
                    version: release.tag_name.clone(),
                    published_at: release.published_at.clone(),
                    download_url: asset.browser_download_url.clone(),
                };
                existing_tags.insert(version.version.clone());
                cached.push(version);
                new_count += 1;
            }
        }

        debug_print!("[BE增量] 第 {} 页新增 {} 个版本", page, new_count);

        save_be_versions_cache(&cached);

        page += 1;
        std::thread::sleep(Duration::from_millis(500));
    }

    debug_print!("[BE增量] 增量更新完成，当前总版本 {}", cached.len());
}

#[tauri::command]
async fn get_be_versions() -> Result<Vec<BeVersion>, String> {
    let cached = load_be_versions_cache().unwrap_or_default();

    if !cached.is_empty() {
        let cached_clone = cached.clone();

        tokio::spawn(async {
            tokio::task::spawn_blocking(fetch_be_incremental_and_save).await.ok();
        });

        return Ok(cached_clone);
    }

    tokio::task::spawn_blocking(|| {
        fetch_be_incremental_and_save();
        load_be_versions_cache().unwrap_or_default()
    })
    .await
    .map_err(|e| format!("线程错误: {}", e))
}

#[tauri::command]
async fn get_versions() -> Vec<GameVersion> {
    let cached = load_version_cache().unwrap_or_default();

    if !cached.is_empty() {
        let cached_clone = cached.clone();

        tokio::spawn(async {
            tokio::task::spawn_blocking(fetch_versions_incremental_and_save).await.ok();
        });

        return cached_clone;
    }

    tokio::task::spawn_blocking(|| {
        fetch_versions_incremental_and_save();
        load_version_cache().unwrap_or_default()
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
async fn download_file(
    task_id: String,
    url: String,
    version: String,
    file_name: String,
    on_progress: Channel<f64>,
    on_speed: Channel<String>
) -> Result<String, String> {
    
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let dest_dir = exe_dir.join("Games").join(&version);
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    let dest_path = dest_dir.join(&file_name);
    let dest_path_part = dest_dir.join(format!("{}.part", file_name));

    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut flags = CANCEL_FLAGS.lock().unwrap();
        flags.insert(task_id.clone(), cancel_flag.clone());
    }

    let max_retries = 2;
    let mut last_err = String::new();

    for attempt in 0..= max_retries {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = std::fs::remove_file(&dest_path);
            let _ = std::fs::remove_dir(&dest_dir);
            let mut flags = CANCEL_FLAGS.lock().unwrap();
            flags.remove(&task_id);
            return Err("下载已被取消".to_string());
        }
        if attempt > 0 {
            debug_print!("[下载]重试第{}次", attempt);
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }

        let result = try_download(&url, &dest_path_part, &file_name, &on_progress, &on_speed, &cancel_flag).await;
        match result {
            Ok(msg) => {
                let mut flags = CANCEL_FLAGS.lock().unwrap();
                flags.remove(&task_id);
                std::fs::rename(&dest_path_part, &dest_path).map_err(|e| format!("重命名失败: {}", e))?;
                return Ok(msg);
            }, 
            Err(e) => {
                if cancel_flag.load(Ordering::Relaxed) {
                    let _ = std::fs::remove_file(&dest_path_part);
                    let _ = std::fs::remove_dir(&dest_dir);
                    let mut flags = CANCEL_FLAGS.lock().unwrap();
                    flags.remove(&task_id);
                    return Err("下载已被取消".to_string());
                }
                last_err = e;
            }
        }
    }
    let mut flags = CANCEL_FLAGS.lock().unwrap();
    flags.remove(&task_id);
    let _ = std::fs::remove_dir(&dest_dir);
    Err(format!("下载失败, 已重试{}次: {}", max_retries, last_err))
}

async fn try_download(
    url: &str,
    dest_path: &PathBuf,
    file_name: &str,
    on_progress: &Channel<f64>,
    on_speed: &Channel<String>,
    cancel_flag: &Arc<AtomicBool>
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("MindustryLauncher/1.0")
        .connect_timeout(std::time::Duration::from_secs(10))
        .read_timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}:{}", status, body));
    }

    
    let total_size = response.content_length().unwrap_or(0);

    
    let mut file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut last_report = std::time::Instant::now();
    let mut last_bytes: u64 = 0;

    
    while let Some(chunk_result) = stream.next().await {
        if cancel_flag.load(Ordering::Relaxed) {
            return Err("取消".to_string());
        }
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let now = std::time::Instant::now();
        let elapsed = now.duration_since(last_report).as_secs_f64();
        if elapsed >= 1.0 {
            let bytes_per_sec = (downloaded - last_bytes) as f64 / elapsed;
            let speed_str = format_speed(bytes_per_sec);
            let _ = on_speed.send(speed_str);

            last_report = now;
            last_bytes = downloaded;
        }

        if total_size > 0 {
            let progress = downloaded as f64 / total_size as f64;
            let _ = on_progress.send(progress);
        }
    }

    let _ = on_speed.send(format_speed(0.0));
    let _ = on_progress.send(1.0);

    Ok(format!("{} 下载完成", file_name))
}

fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec >= 1_000_000.0 {
        format!("{:.1}MB/s", bytes_per_sec / 1_000_000.0)
    } else if bytes_per_sec >= 1_000.0 {
        format!("{:.1}KB/s", bytes_per_sec / 1_000.0)
    } else if bytes_per_sec > 0.0 {
        format!("{:.0}B/s", bytes_per_sec)
    } else {
        "".to_string()
    }
}

#[tauri::command]
fn cancel_download(task_id: String) -> Result<(), String> {
    let flags = CANCEL_FLAGS.lock().unwrap();
    if let Some(flag) = flags.get(&task_id) {
        flag.store(true, Ordering::Relaxed);
        Ok(())
    } else {
        Err("下载任务不存在".to_string())
    }
}

#[tauri::command]
fn get_installed_versions() -> Vec<InstalledVersion> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let games_dir = exe_dir.join("Games");
    let mut result = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&games_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(version) = path.file_name().and_then(|n| n.to_str()) {
                    let game_jar = path.join("Mindustry.jar");
                    let server_jar = path.join("server-release.jar");
                    let has_game = game_jar.exists();
                    let has_server = server_jar.exists();
                    if has_game || has_server {
                        result.push(InstalledVersion {
                            version: version.to_string(),
                            has_game,
                            has_server
                        });
                    }
                }
            }
        }
    }

    result.sort_by(|a, b| b.version.cmp(&a.version));
    result
}

#[tauri::command]
fn launch_game(version: String, java_path: String) -> Result<String, String> {

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let game_dir = exe_dir.join("Games").join(&version);
    let jar_path = game_dir.join("Mindustry.jar");
    let data_dir = game_dir.join("data");

    if !jar_path.exists() {
        return Err("游戏文件不存在".to_string());
    }

    std::fs::create_dir_all(&data_dir).map_err(|e| format!("无法创建数据目录: {}", e))?;

    let java_exe = if java_path.ends_with(".exe") || java_path.ends_with("java") {
        java_path
    } else {
        let exe_path = format!("{}/bin/java.exe", java_path);
        if std::path::Path::new(&exe_path).exists() {
            exe_path
        } else {
            format!("{}/bin/java", java_path)
        }
    };

    let is_legacy = match version.replace("v", "").split('.').next() {
        Some(major_str) => major_str.parse::<u32>().unwrap_or(0) < 146,
        None => false
    };

    if is_legacy {
    
        let mindustry_link = game_dir.join("Mindustry");
        if mindustry_link.exists() {
            if mindustry_link.is_symlink() {
                std::fs::remove_dir(&mindustry_link)
                    .or_else(|_| std::fs::remove_file(&mindustry_link))
                    .ok();
                std::fs::remove_dir_all(&mindustry_link).ok();
            } else if mindustry_link.is_dir() {
                if let Ok(entries) = std::fs::read_dir(&mindustry_link) {
                    for entry in entries.flatten() {
                        let src = entry.path();
                        let dest = data_dir.join(entry.file_name());
                        if !dest.exists() {
                            std::fs::rename(&src, &dest).ok();
                        }
                    }
                }
                std::fs::remove_dir_all(&mindustry_link).ok();
            }
        }

        let link_str = mindustry_link.to_str().unwrap_or("");
        let target_str = data_dir.to_str().unwrap_or("");
        let output = std::process::Command::new("cmd")
            .args(&["/C", "mklink", "/J", link_str, target_str])
            .output()
            .map_err(|e| format!("创建目录联接失败: {}", e))?;

        if !output.status.success() {
            return Err(format!("mklink 执行失败: {}", String::from_utf8_lossy(&output.stderr)));
        }
    
        let appdata_value = game_dir
            .to_str()
            .ok_or("无效游戏目录路径")?
            .trim()
            .to_string();

        std::process::Command::new(&java_exe)
            .arg("-jar")
            .arg(&jar_path)
            .env("APPDATA", &appdata_value)
            .spawn()
            .map_err(|e| e.to_string())?;

    } else {
        let data_dir_str = data_dir.to_str().unwrap_or(".");
        let jvm_arg = format!("-Dmindustry.data.dir={}", data_dir_str);

        std::process::Command::new(&java_exe)
            .arg(&jvm_arg)
            .arg("-jar")
            .arg(jar_path)
            .env("MINDUSTRY_DATA_DIR", data_dir_str)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok("游戏已启动".to_string())
}

#[tauri::command]
fn delete_version(version: String, delete_target: String) -> Result<String, String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let version_dir = exe_dir.join("Games").join(&version);

    match delete_target.as_str() {
        "all" => {
            std::fs::remove_dir_all(&version_dir).map_err(|e| e.to_string())?;
        }
        "game" => {
            let game_jar = version_dir.join("Mindustry.jar");
            if game_jar.exists() {
                std::fs::remove_file(game_jar).map_err(|e| e.to_string())?;
            }
        }
        "server" => {
            let server_jar = version_dir.join("server-release.jar");
            if server_jar.exists() {
                std::fs::remove_file(server_jar).map_err(|e| e.to_string())?;
            }
        }
        _ => return Err("无效的删除选项".to_string()),
    }

    
    let game_jar = version_dir.join("Mindustry.jar");
    let server_jar = version_dir.join("server-release.jar");
    if !game_jar.exists() && !server_jar.exists() {
        std::fs::remove_dir_all(&version_dir).ok();
    }
    Ok("删除成功".to_string())
}

#[tauri::command]
fn save_play_record(version: String) {
    let record = PlayRecord {
        version,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    let path = get_app_data_dir().join("play_history.json");
    if let Ok(json) = serde_json::to_string_pretty(&record) {
        fs::write(&path, json).ok();
    }
}

#[tauri::command]
fn load_play_record() -> Option<PlayRecord> {
    let path = get_app_data_dir().join("play_history.json");
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str::<PlayRecord>(&content).ok()
    } else {
        None
    }
}

#[tauri::command]
fn copy_data_between_versions(source_version: String, target_version: String, modules: Vec<String>) -> Result<String, String> {
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())).unwrap_or_else(|| PathBuf::from("."));
    let src_data = exe_dir.join("Games").join(&source_version).join("data");
    let dst_data = exe_dir.join("Games").join(&target_version).join("data");
    if !src_data.exists() {
        return Err("来源版本数据目录不存在".into());
    }
    std::fs::create_dir_all(&dst_data).map_err(|e| e.to_string())?;

    for module in &modules {
        let src = src_data.join(module);
        let dst = dst_data.join(module);
        if src.exists() {
            if dst.exists() {
                std::fs::remove_dir_all(&dst).or_else(|_| std::fs::remove_file(&dst)).map_err(|e| e.to_string())?;
            }
            copy_dir_recursive(&src, &dst).map_err(|e| format!("复制 {} 失败: {}", module, e))?;
        }
    }
    Ok("数据复制完成".into())
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn fetch_mods() -> Result<Vec<ModInfo>, String> {
    let cache_path = get_app_data_dir().join("mods_cache.json");

    if let Ok(content) = fs::read_to_string(&cache_path) {
        if let Ok(cache) = serde_json::from_str::<ModCache>(&content) {
            if let Ok(updated) = chrono::DateTime::parse_from_rfc3339(&cache.last_updated) {
                let now = chrono::Utc::now();
                let duration = now.signed_duration_since(updated);
                if duration.num_hours() < 1 {
                    debug_print!("[Mods] 使用缓存 ({} 个模组)", cache.mods.len());
                    return Ok(cache.mods);
                }
            }
        }
    }

    let mods = tokio::task::spawn_blocking(move || -> Result<Vec<ModInfo>, String> {
        let client = reqwest::blocking::Client::builder()
            .user_agent("MindustryLauncher/1.0")
            .build()
            .map_err(|e| e.to_string())?;

        let url = "https://api.github.com/search/repositories?q=topic:mindustry-mod&sort=stars&order=desc&per_page=100";
        let response = client
            .get(url)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .map_err(|e| format!("请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("GitHub API 返回错误: {}", response.status()));
        }

        #[derive(serde::Deserialize)]
        struct SearchResponse {
            items: Vec<RepoItem>,
        }
        #[derive(serde::Deserialize)]
        struct RepoItem {
            name: String,
            full_name: String,
            owner: OwnerItem,
            description: Option<String>,
            stargazers_count: u32,
            updated_at: String,
        }
        #[derive(serde::Deserialize)]
        struct OwnerItem {
            login: String,
        }

        let search_result: SearchResponse = response.json().map_err(|e| e.to_string())?;

        let mods: Vec<ModInfo> = search_result.items.iter().map(|repo| {
            ModInfo {
                name: repo.full_name.clone(),
                display_name: repo.name.clone(),
                author: repo.owner.login.clone(),
                description: repo.description.clone().unwrap_or_default(),
                repo: repo.full_name.clone(),
                stars: repo.stargazers_count,
                last_updated: repo.updated_at.clone(),
            }
        }).collect();

        debug_print!("[Mods] 从 GitHub 获取到 {} 个模组", mods.len());

        let cache = ModCache {
            mods: mods.clone(),
            last_updated: chrono::Utc::now().to_rfc3339(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&cache) {
            fs::write(&cache_path, json).ok();
        }
        Ok(mods)
    }).await.unwrap_or_else(|_| Err("线程错误".to_string()))?;

    Ok(mods)
}

#[tauri::command]
async fn fetch_mod_versions(repo: String) -> Result<Vec<ModVersion>, String> {
    tokio::task::spawn_blocking(move || {
        let client = reqwest::blocking::Client::builder()
            .user_agent("MindustryLauncher/1.0")
            .build()
            .map_err(|e| e.to_string())?;

        let url = format!("https://api.github.com/repos/{}/releases?per_page=30", repo);
        let response = client
            .get(&url)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("GitHub API 返回错误: {}", response.status()));
        }

        #[derive(serde::Deserialize)]
        struct GhRelease {
            tag_name: String,
            published_at: String,
            assets: Vec<GhAsset>,
        }
        #[derive(serde::Deserialize)]
        struct GhAsset {
            name: String,
            browser_download_url: String,
            content_type: String,
            size: u64,
        }

        let releases: Vec<GhRelease> = response.json().map_err(|e| e.to_string())?;

        let versions: Vec<ModVersion> = releases
            .iter()
            .map(|r| {
                let assets: Vec<ModAsset> = r
                    .assets
                    .iter()
                    .filter(|a| a.name.ends_with(".jar") || a.name.ends_with(".zip"))
                    .map(|a| ModAsset {
                        name: a.name.clone(),
                        browser_download_url: a.browser_download_url.clone(),
                        content_type: a.content_type.clone(),
                        size: a.size,
                    })
                    .collect();
                ModVersion {
                    tag_name: r.tag_name.clone(),
                    published_at: r.published_at.clone(),
                    assets,
                }
            })
            .filter(|v| !v.assets.is_empty())
            .collect();

        Ok(versions)
    })
    .await
    .unwrap_or_else(|_| Err("线程错误".to_string()))
}

#[tauri::command]
async fn check_mod_compatibility(repo: String, target_version: String) -> Result<bool, String> {

    let game_major = target_version
        .trim_start_matches('v')
        .split('.')
        .next()
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(0);

    tokio::task::spawn_blocking(move || {

        let client = reqwest::blocking::Client::builder()
            .user_agent("MindustryLauncher/1.0")
            .build()
            .map_err(|e| e.to_string())?;

        for file_name in &["mod.json", "mod.hjson"] {
            let url = format!("https://raw.githubusercontent.com/{}/master/{}", repo, file_name);
            if let Ok(response) = client.get(&url).send() {
                if response.status().is_success() {
                    if let Ok(text) = response.text() {
                        if let Some(pos) = text.find("minGameVersion") {
                            let after = &text[pos..];
                            if let Some(colon) = after.find(':') {
                                let num_str = after[colon + 1..]
                                    .trim()
                                    .chars()
                                    .take_while(|c| c.is_digit(10))
                                    .collect::<String>();
                                if let Ok(min_ver) = num_str.parse::<i32>() {
                                    return Ok(game_major >= min_ver);
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(true)
    }).await.unwrap_or_else(|_| Err("线程错误".to_string()))
}

#[tauri::command]
async fn download_mod(url: String, target_version: String, file_name: String) -> Result<String, String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let mods_dir = exe_dir.join("Games").join(&target_version).join("data").join("mods");
    std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
    let dest_path = mods_dir.join(&file_name);

    let client = reqwest::Client::builder()
        .user_agent("MindustryLauncher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;

    Ok(format!("{} 已安装", file_name))
}

#[tauri::command]
fn get_installed_mods(version: String) -> Vec<String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let mods_dir = exe_dir.join("Games").join(&version).join("data").join("mods");
    if !mods_dir.exists() {
        return Vec::new();
    }
    let mut mods = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&mods_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".jar") || name.ends_with(".zip") {
                mods.push(name);
            }
        }
    }
    mods.sort();
    mods
}

#[tauri::command]
fn delete_installed_mod(version: String, mod_name: String) -> Result<String, String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let mod_path = exe_dir.join("Games").join(&version).join("data").join("mods").join(&mod_name);
    if mod_path.exists() {
        std::fs::remove_file(&mod_path).map_err(|e| e.to_string())?;
        Ok("已删除".to_string())
    } else {
        Err("模组文件不存在".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_jdks, 
            detect_and_save_jdks, 
            load_java_config_cmd, 
            select_java, 
            get_be_versions, 
            get_versions, 
            download_file, 
            cancel_download, 
            get_installed_versions, 
            launch_game, 
            delete_version, 
            save_play_record, 
            load_play_record, 
            copy_data_between_versions,
            fetch_mods, 
            fetch_mod_versions, 
            check_mod_compatibility, 
            download_mod, 
            get_installed_mods, 
            delete_installed_mod
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
