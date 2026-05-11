import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import SkeletonCard from "../components/SkeletonCard";
import Button from "../components/Button";
import type { ModInfo, ModVersion, ModAsset, InstalledVersion } from "../types";

function formatSize(bytes: number): string {
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

interface Props {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  startDownload: (url: string, version: string, fileName: string) => void;
  showConfirm: (msg: string, onConfirm: () => void, onCancel?: () => void) => void;
}

export default function ModsPage({ showToast, startDownload, showConfirm }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"browse" | "local">("browse");
  const [mods, setMods] = useState<ModInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"stars" | "updated">("stars");
  const [installedVersions, setInstalledVersions] = useState<InstalledVersion[]>([]);
  const [targetVersion, setTargetVersion] = useState("");
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [modVersions, setModVersions] = useState<ModVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [compatibilityMap, setCompatibilityMap] = useState<Record<string, boolean>>({});
  const [localMods, setLocalMods] = useState<string[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [modResult, verResult] = await Promise.all([
          invoke<ModInfo[]>("fetch_mods"),
          invoke<InstalledVersion[]>("get_installed_versions"),
        ]);
        setMods(modResult);
        const gameVersions = verResult.filter(v => v.has_game);
        setInstalledVersions(gameVersions);
        if (gameVersions.length > 0) setTargetVersion(gameVersions[0].version);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (tab === "local" && targetVersion) loadLocalMods();
  }, [tab, targetVersion]);

  const loadLocalMods = async () => {
    setLoadingLocal(true);
    try {
      const result = await invoke<string[]>("get_installed_mods", { version: targetVersion });
      setLocalMods(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleDeleteMod = (modName: string) => {
    showConfirm(t("mods.confirmDelete", {modName: modName}), async () => {
      try {
        await invoke("delete_installed_mod", { version: targetVersion, modName });
        showToast(t("mods.deleteSuccess", {modName: modName}), 'success');
        await loadLocalMods();
      } catch (e) {
        showToast(t("mods.deleteFailed", {error: String(e)}), 'error');
      }
    });
  };

  const handleExpand = async (mod: ModInfo) => {
    if (expandedMod === mod.repo) {
      setExpandedMod(null);
      return;
    }
    setExpandedMod(mod.repo);
    setLoadingVersions(true);
    try {
      const [versions, compat] = await Promise.all([
        invoke<ModVersion[]>("fetch_mod_versions", { repo: mod.repo }),
        targetVersion ? invoke<boolean>("check_mod_compatibility", { repo: mod.repo, targetVersion }) : Promise.resolve(true),
      ]);
      setModVersions(versions);
      setCompatibilityMap(prev => ({ ...prev, [mod.repo]: compat }));
    } catch (e) {
      console.error(e);
      showToast(t("mods.fetchVersionsFailed"), 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleInstall = (asset: ModAsset) => {
    if (!targetVersion) {
      showToast(t("mods.selectVersion"), 'warning');
      return;
    }
    startDownload(asset.browser_download_url, targetVersion, `data/mods/${asset.name}`);
  };

  const filteredMods = mods
    .filter(m => {
      const q = search.toLowerCase();
      return !q || m.display_name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.author.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sortBy === "stars" ? b.stars - a.stars : new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );

  const versionSelector = (
    <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>{t("mods.targetVersion")}</span>
      <select value={targetVersion} onChange={e => setTargetVersion(e.target.value)}
        style={{
          padding: "6px 10px",
          background: "var(--bg-primary)",
          border: "2px solid var(--border-color)",
          color: "var(--text-primary)",
          fontSize: "13px",
        }}>
        {installedVersions.map(v => (
          <option key={v.version} value={v.version}>{v.version}</option>
        ))}
      </select>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "24px" }}>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
      <h2 style={{ marginBottom: "16px", fontSize: "15px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "2px solid var(--border-color)", paddingBottom: "8px" }}>
        {t("sidebar.mods")}
      </h2>
      <div style={{ marginBottom: "16px", display: "flex", gap: "16px" }}>
        <button onClick={() => setTab("browse")} style={{
          padding: "8px 20px", borderRadius: "6px",
          background: tab === "browse" ? "var(--accent)" : "transparent",
          border: tab === "browse" ? "none" : "1px solid var(--border)",
          color: tab === "browse" ? "#fff" : "var(--text-secondary)",
          cursor: "pointer", fontWeight: tab === "browse" ? 600 : 400,
        }}>{t("mods.browse")}</button>
        <button onClick={() => setTab("local")} style={{
          padding: "8px 20px", borderRadius: "6px",
          background: tab === "local" ? "var(--accent)" : "transparent",
          border: tab === "local" ? "none" : "1px solid var(--border)",
          color: tab === "local" ? "#fff" : "var(--text-secondary)",
          cursor: "pointer", fontWeight: tab === "local" ? 600 : 400,
        }}>{t("mods.local")}</button>
      </div>
      {installedVersions.length > 0 ? versionSelector : (
        <p style={{ color: "var(--text-muted)", marginBottom: "12px" }}>{t("mods.noVersionHint")}</p>
      )}
      {tab === "browse" ? (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <input type="text" placeholder={t("mods.search")} value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", background: "var(--bg-primary)", border: "2px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as "stars" | "updated")}
              style={{ padding: "8px 12px", background: "var(--bg-primary)", border: "2px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px" }}>
              <option value="stars">{t("mods.sortByStars")}</option>
              <option value="updated">{t("mods.sortByUpdated")}</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredMods.map((mod, i) => (
              <motion.div key={mod.repo} initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}>
                <div onClick={() => handleExpand(mod)} style={{
                  background: "var(--bg-secondary)", border: "2px solid var(--border-color)", boxShadow: "4px 4px 0px rgba(0,0,0,0.4)",
                  padding: "14px 18px", cursor: "pointer", transition: "transform 0.15s ease-out",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.5px", marginBottom: "4px" }}>
                      {mod.display_name}
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)" }}>by {mod.author}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      {mod.description.length > 100 ? mod.description.slice(0, 100) + "..." : mod.description}
                    </p>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      ⭐ {mod.stars} · {new Date(mod.last_updated).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{expandedMod === mod.repo ? "▲" : "▼"}</span>
                </div>
                {expandedMod === mod.repo && (
                  <div style={{ marginLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {loadingVersions ? (
                      <div style={{ background: "var(--bg-secondary)", border: "2px solid var(--border-color)", boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.4)", padding: "12px 16px", marginLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", animation: "skeleton-pulse 1.5s ease-in-out infinite" }}>
                        <div style={{ width: "35%", height: "12px", background: "var(--border-color)" }} />
                        <div style={{ width: "45%", height: "10px", background: "var(--border-color)" }} />
                        <div style={{ width: "25%", height: "10px", background: "var(--border-color)" }} />
                      </div>
                    ) : modVersions.length === 0 ? (
                      <p style={{ color: "var(--text-muted)" }}>{t("mods.noVersions")}</p>
                    ) : (
                      modVersions.map((ver, j) => (
                        <motion.div key={ver.tag_name} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: j * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                          style={{ background: "var(--bg-secondary)", border: "2px solid var(--border-color)", boxShadow: "4px 4px 0px rgba(0,0,0,0.4)", padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{ver.tag_name}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(ver.published_at).toLocaleDateString()}</span>
                          </div>
                          {ver.assets.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {ver.assets.map(asset => {
                                const ext = asset.name.split('.').pop()?.toLowerCase();
                                const compat = compatibilityMap[mod.repo] !== undefined
                                  ? (compatibilityMap[mod.repo] ? 'compatible' : 'incompatible')
                                  : 'unknown';
                                return (
                                  <div key={asset.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                      <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{asset.name}</span>
                                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--text-muted" }}>({ext?.toUpperCase()}    {formatSize(asset.size)})</span>
                                      {compat === 'compatible' && <span style={{ marginLeft: "8px", color: "var(--success", fontSize: "11px" }}>{t("mods.compatible")}</span>}
                                      {compat === 'incompatible' && <span style={{ marginLeft: "8px", color: "var(--danger", fontSize: "11px" }}>{t("mods.incompatible")}</span>}
                                    </div>
                                    <Button variant="primary" size="sm" onClick={() => handleInstall(asset)} disabled={!targetVersion}>INSTALL</Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>{t("mods.noAssets")}</p>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loadingLocal ? (
            <><SkeletonCard /><SkeletonCard /></>
          ) : localMods.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>{t("mods.emptyLocal")}</p>
          ) : (
            localMods.map((modName, i) => (
              <motion.div key={modName} initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ background: "var(--bg-secondary)", border: "2px solid var(--border-color)", boxShadow: "4px 4px 0px rgba(0,0,0,0.4)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px" }}>{modName}</span>
                <Button variant="secondary" size="sm" onClick={() => handleDeleteMod(modName)}>{t("version.delete")}</Button>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}