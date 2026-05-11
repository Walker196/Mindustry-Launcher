import type {JavaConfig, DownloadTask, Toast} from "./types";


import HomePage from "./pages/HomePage";
import VersionsPage from "./pages/VersionsPage";
import DownloadsPage from "./pages/DownloadsPage";
import ModsPage from "./pages/ModsPage";
import SettingsPage from "./pages/SettingsPage";

import ToastContainer from "./components/ToastContainer";
import ConfirmDialog from "./components/ConfirmDialog";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence  } from "framer-motion";
import { invoke, Channel } from "@tauri-apps/api/core";
import {
  IoHome,
  IoDownload,
  IoCloudDownload,
  IoExtensionPuzzle,
  IoSettings,
  IoLanguage
} from "react-icons/io5";
           
function App() {
  const { t, i18n } = useTranslation();
  const [ activePage, setActivePage ] = useState("home");
  const [ javaConfig, setJavaConfig ] = useState<JavaConfig>({ jdks: [], selected_path: null });
  const [ scanning, setScanning ] = useState(false);
  const [ downloadTasks, setDownloadTasks ] = useState<DownloadTask[]>([]);
  const [ toasts, setToasts ] = useState<Toast[]>([]);
  const [ sidebarCollapsed, setSidebarCollapsed ] = useState(false);
  const [ confirmDialog, setConfirmDialog ] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showConfirm = useCallback((message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmDialog({message, onConfirm, onCancel});
  }, []);

  const downloadTasksRef = useRef(downloadTasks);
  downloadTasksRef.current = downloadTasks;

  useEffect(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.transition = 'opacity 0.3s';
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  }, []);

  useEffect(() => {
    async function loadJavaConfig() {
      try {
        const config = await invoke<JavaConfig>("load_java_config_cmd");
        setJavaConfig(config);
      } catch (e) {
        console.error("加载 Java 配置失败:", e);
      }
    }
    loadJavaConfig();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "versions") setActivePage("versions");
    };
    window.addEventListener("navigate", handler);
    return () => window.removeEventListener("navigate", handler);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const startDownload = useCallback(async (url: string, version: string, fileName: string) => {
    const tasks = downloadTasksRef.current;
  
    const existing = tasks.find(
      t => t.url === url || (t.version === version && t.fileName === fileName)
    );

    if (existing) {
      if (existing.status === 'downloading') {
        showToast(t("download.alreadyDownloading", {fileName: fileName}), 'info');
        return;
      } else if (existing.status === 'completed') {
        const userConfirmed = await new Promise<boolean>(resolve => {
          showConfirm(t("download.reDownload", {fileName: fileName}), () => resolve(true), () => resolve(false));
        });
        if (!userConfirmed) return;
        
        setDownloadTasks(prev => prev.filter(t => t.id !== existing.id));
      } else if (existing.status === 'error') {
        
        setDownloadTasks(prev => prev.filter(t => t.id !== existing.id));
      }
    }
    
    const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const newTask: DownloadTask = {
      id: taskId,
      url,
      fileName,
      version,
      progress: 0,
      speed: "",
      status: "downloading"
    };

    setDownloadTasks(prev => [...prev, newTask]);
    showToast(t("download.added", {fileName: fileName}), 'success');

    try {
      const onProgress = new Channel<number>();
      onProgress.onmessage = (progress) => {
        setDownloadTasks(prev => 
          prev.map(t => (t.id === taskId ? { ...t, progress } : t))
        );
      };
      const onSpeed = new Channel<string>();
      onSpeed.onmessage = (speed) => {
        setDownloadTasks(prev => 
          prev.map(t => (t.id === taskId ? {...t, speed} : t))
        );
      };
      await invoke("download_file", {
        taskId: taskId,
        url,
        version,
        fileName,
        onProgress,
        onSpeed
      });

      showToast(t("download.completed", {fileName: fileName}), 'success');
      setDownloadTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: "completed", progress: 1 } : t))
      );
      setTimeout(() => {
        setDownloadTasks(prev => prev.filter(t => t.id !== taskId));
      }, 3000);
    } catch (error: any) {
      const msg = String(error);
      if (msg.includes("取消") || msg.includes("cancel")) {
        return;
      }
      showToast(t("download.failed", {fileName: fileName}), 'error');
      setDownloadTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: "error", errorMsg: String(error) } : t))
      );
      setTimeout(() => {
        setDownloadTasks(prev => prev.filter(t => t.id !== taskId));
      }, 8000);
    }
  }, [])

  const cancelDownload = useCallback((taskId: string) => {
    showConfirm(t("download.cancelConfirm"), async () => {
      try {
        await invoke("cancel_download", {taskId});
      } catch (e) {
        console.log("取消下载失败:", e);
      }
      setDownloadTasks(prev => prev.filter(t => t.id !== taskId));
    });
  }, [showConfirm]);

  const dismissTask = useCallback((taskId: string) => {
    setDownloadTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleDetectJava = async () => {
    setScanning(true);
    try {
      const config = await invoke<JavaConfig>("detect_and_save_jdks");
      setJavaConfig(config);
    } catch (error) {
      console.error("检测失败：", error);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectJava = async (path: string) => {
  try {
    const config = await invoke<JavaConfig>("select_java", { path });
    setJavaConfig(config);
    showToast(t("java.switchSuccess"), 'success');
  } catch (e) {
    showToast(t("java.switchFailed", {error: String(e)}), 'error');
  }
};

  const pages: Record<string, {label: string; icon: React.ReactNode}> = {
  home: { label: t("sidebar.home"), icon: <IoHome/> }, 
  versions: { label: t("sidebar.versions"), icon: <IoDownload/> },
  downloads: { label: t("sidebar.downloads"), icon: <IoCloudDownload/> },
  mods: { label: t("sidebar.mods"), icon: <IoExtensionPuzzle/> },
  settings: { label: t("sidebar.settings"), icon: <IoSettings/> }
};

  const toggleLanguage = () => {
    const newLang = i18n.language === "zh-CN" ? "en" : "zh-CN";
    i18n.changeLanguage(newLang);
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ToastContainer toasts={toasts}/>
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)}/>
        )}
      </AnimatePresence>
      <header
        data-tauri-drag-region
        style={{
          height: "var(--titlebar-height)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border)"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
          {t("app.title")}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={toggleLanguage}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px"
            }}
          >
            <IoLanguage size={16}/>
            {t("common.switchTo")}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <nav
          style={{
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "12px 0",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "8px 16px",
              marginBottom: "8px",
              fontSize: "18px",
              display: "flex",
              justifyContent: sidebarCollapsed ? "center" : "flex-end",
              transition: "justify-content 0.25s",
              overflow: "hidden"
            }}
            title={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            <motion.span
              key={sidebarCollapsed ? "collapsed" : "expanded"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              style={{ display: "inline-block" }}
            >
              {sidebarCollapsed ? "☰" : "✕"}
            </motion.span>
          </button>
          {Object.entries(pages).map(([key, page]) => (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              title={sidebarCollapsed ? page.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                gap: "10px",
                padding: "10px 12px 10px 16px",
                margin: "2px 8px",
                borderRadius: "8px",
                background: activePage === key ? "var(--bg-hover)" : "transparent",
                border: "none",
                borderLeft: activePage === key && !sidebarCollapsed ? "3px solid var(--accent)" : "3px solid transparent",
                color: activePage === key ? "var(--accent)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "14px",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s, padding-left 0.25s",
                paddingLeft: activePage === key && !sidebarCollapsed ? "13px" : "16px"
              }}
            >
              <span style={{ fontSize: sidebarCollapsed ? "20px" : "16px", transition: "font-size 0.25s", lineHeight: 1, flexShrink: 0 }}>
                {page.icon}
              </span>
              <motion.span
                animate={{
                  opacity: sidebarCollapsed ? 0 : 1,
                  width: sidebarCollapsed ? 0 : 140,
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  display: "inline-block"
                }}
              >
                {page.label}
              </motion.span>
            </button>
          ))}
        </nav>

        <main style={{ flex: 1,
          overflow: "auto",
          background: `
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "float-grid 20s linear infinite"
          }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              style={{ height: "100%" }}
            >
              {activePage === "home" && <HomePage javaPath={javaConfig.selected_path} showToast={showToast}/>}
              {activePage === "versions" && <VersionsPage onStartDownload={startDownload} javaPath={javaConfig.selected_path} showToast={showToast}/>}
              {activePage === "downloads" && <DownloadsPage tasks={downloadTasks} onCancel={cancelDownload} onDismiss={dismissTask}/>}
              {activePage === "mods" && <ModsPage showToast={showToast} startDownload={startDownload} showConfirm={showConfirm}/>}
              {activePage === "settings" && <SettingsPage 
                javaConfig={javaConfig} 
                scanning={scanning} 
                onDetect={handleDetectJava}
                onSelectJava={handleSelectJava}
                />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <footer
        style={{
          height: "var(--statusbar-height)",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: "12px",
          color: "var(--text-secondary)",
          justifyContent: "space-between"
        }}
      >
        <span>
          {javaConfig.selected_path 
            ? `Java: ${javaConfig.jdks.find(j => j.path === javaConfig.selected_path)?.version || t("java.unknown")}`
            : t("java.undetected")}
        </span>
        <span>Mindustry Launcher v0.1.0</span>
      </footer>
    </div>
  );
}

export default App;
