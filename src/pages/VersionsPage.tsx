import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import SkeletonCard from "../components/SkeletonCard";
import Button from "../components/Button";
import type { GameVersion, BeVersion, InstalledVersion } from "../types";

function extractHighlights(body: string): { label: string; count: number; color: string }[] {
  if (!body) return [];

  const highlightsMap: Record<string, { label: string; color: string; count: number }> = {
    added:   { label: '🆕Adds', color: '#4caf50', count: 0 },
    fixed:   { label: '🐛Fixes', color: '#ff9800', count: 0 },
    changed: { label: '🔧Changes', color: '#2196f3', count: 0 },
    removed: { label: '❌Removes', color: '#f44336', count: 0 },
  };

  const sectionRegex = /###\s*(Added?|Fixed?|Changed?|Removed?)\b[^\n]*\n([\s\S]*?)(?=\n###\s|\n##\s|\n#\s|$)/gi;
  let match;
  while ((match = sectionRegex.exec(body)) !== null) {
    const type = match[1].toLowerCase();
    const sectionContent = match[2];
    const items = (sectionContent.match(/^\s*-\s/gm) || []).length;
    if (items > 0) {
      const key = Object.keys(highlightsMap).find(k => type.startsWith(k));
      if (key) highlightsMap[key].count += items;
    }
  }

  if (Object.values(highlightsMap).every(h => h.count === 0)) {
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) continue;
      const lower = trimmed.toLowerCase();
      if (lower.includes('added')) highlightsMap.added.count++;
      else if (lower.includes('fixed')) highlightsMap.fixed.count++;
      else if (lower.includes('changed')) highlightsMap.changed.count++;
      else if (lower.includes('removed')) highlightsMap.removed.count++;
    }
  }

  return Object.values(highlightsMap).filter(h => h.count > 0);
}

function chipStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    padding: "2px 8px",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    border: `1px solid ${color}`,
    background: `${color}18`,
    color: color,
    clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)",
  };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 20px",
    borderRadius: "6px",
    background: active ? "var(--accent)" : "transparent",
    border: active ? "none" : "1px solid var(--border)",
    color: active ? "#fff" : "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
  };
}

function VersionCard({
  version,
  onStartDownload,
  showToast,
}: {
  version: GameVersion;
  onStartDownload: (url: string, version: string, fileName: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const { t } = useTranslation();
  const [showChangelog, setShowChangelog] = useState(false);

  const handleDownloadGame = async () => {
    onStartDownload(version.download_url, version.version, "Mindustry.jar");
  };

  const handleDownloadServer = async () => {
    const url = version.server_download_url;
    if (url && typeof url === 'string' && url.length > 0) {
      onStartDownload(url, version.version, "server-release.jar");
    } else {
      showToast(t("version.noServer"), 'info');
    }
  };

  const highlights = extractHighlights(version.body);

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "2px solid var(--border-color)",
        boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.4)",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong style={{ fontSize: "16px", color: "var(--accent)", letterSpacing: "0.5px" }}>{version.version}</strong>
          <span style={{ marginLeft: "12px", color: "var(--text-muted)", fontSize: "11px" }}>
            {new Date(version.published_at).toLocaleDateString()}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {version.has_server && (
            <Button variant="secondary" size="sm" onClick={handleDownloadServer}>
              {t("version.download_server")}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleDownloadGame}>
            {t("version.download")}
          </Button>
        </div>
      </div>

      {highlights.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
          {highlights.map((h, i) => (
            <span key={i} style={chipStyle(h.color)}>
              {h.label} {h.count}
            </span>
          ))}
        </div>
      )}

      {version.body && (
        <div>
          <button
            onClick={() => setShowChangelog(!showChangelog)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "11px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {showChangelog ? "▲" : "▼"} {t("version.changelog")}
          </button>
          {showChangelog && (
            <div
              style={{
                marginTop: "8px",
                padding: "10px 14px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                maxHeight: "140px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "'Mindustry', monospace",
                lineHeight: 1.5,
              }}
            >
              {version.body}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function VersionGroup({
  major,
  versions,
  onStartDownload,
  showToast,
}: {
  major: string;
  versions: GameVersion[];
  onStartDownload: (url: string, version: string, fileName: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -60 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          padding: "6px 0",
          marginBottom: "6px",
          userSelect: "none",
          color: "var(--text-primary)",
          fontSize: "16px",
          fontWeight: 600,
          borderBottom: "1px solid var(--border-color)",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        <span
          style={{
            marginRight: "8px",
            transition: "transform 0.2s",
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
          }}
        >
          ▶
        </span>
        v{major}
        <span
          style={{
            marginLeft: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: 400,
            letterSpacing: "0.5px",
          }}
        >
          ({versions.length} RELEASES)
        </span>
      </div>
      {expanded && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{ marginLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}
        >
          {versions.map((v) => (
            <motion.div
              key={v.version}
              variants={item}
              whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.15 } }}
            >
              <VersionCard version={v} onStartDownload={onStartDownload} showToast={showToast} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}


function InstalledPage({
  javaPath,
  showToast
}: {
  javaPath: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const { t } = useTranslation();
  const [installed, setInstalled] = useState<InstalledVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteInfo, setDeleteInfo] = useState<{
    version: string;
    target: string;
    fileName: string;
  } | null>(null);

  const [dataModalVersion, setDataModalVersion] = useState<string | null>(null);

  const loadInstalled = async () => {
    try {
      const result = await invoke<InstalledVersion[]>("get_installed_versions");
      setInstalled(result);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInstalled().then(() => setLoading(false));
  }, []);

  const handleLaunch = async (version: string, server: boolean = false) => {
    if (!javaPath) {
      showToast(t("java.notSelected"), 'info');
      return;
    }
    try {
      await invoke("launch_game", { version, javaPath });
      showToast(t("version.launchSuccess"), 'success');
      if (!server) await invoke("save_play_record", { version });
    } catch (e) {
      showToast(t("version.launchFailed", { error: String(e) }), 'error');
    }
  };

  const confirmDelete = (version: string, target: 'game' | 'server') => {
    const fileName = target === 'game' ? 'Mindustry.jar' : 'server-release.jar';
    setDeleteInfo({ version, target, fileName });
  };

  const executeDelete = async () => {
    if (!deleteInfo) return;
    try {
      await invoke("delete_version", {
        version: deleteInfo.version,
        deleteTarget: deleteInfo.target,
      });
      await loadInstalled();
      showToast(t("version.deleteSuccess"), 'success');
    } catch (e) {
      showToast(t("version.deleteFailed", { error: String(e) }), 'error');
    } finally {
      setDeleteInfo(null);
    }
  };

  if (loading) return <div style={{ padding: "24px" }}>{t("common.loading")}</div>;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 10000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const dialogStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "2px solid var(--border-color)",
    boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px var(--accent-glow)",
    padding: "24px",
    minWidth: "360px",
    maxWidth: "480px",
    textAlign: "center",
    animation: "slide-up 0.25s ease-out",
  };

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
      <h2 style={{
        marginBottom: "16px",
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        borderBottom: "2px solid var(--border-color)",
        paddingBottom: "8px",
      }}>
        {t("version.installed")}
      </h2>
      {installed.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{t("version.noInstalls")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {installed.map((v, i) => (
            <motion.div
              key={v.version}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                background: "var(--bg-secondary)",
                border: "2px solid var(--border-color)",
                boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.4)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
              }}
              whileHover={{ y: -2 }}
            >
              <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--accent)" }}>
                {v.version}
              </div>
              {v.has_game && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🎮</span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {t("version.gameClient")}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button variant="primary" size="sm" onClick={() => handleLaunch(v.version)}>
                      {t("version.launch")}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => confirmDelete(v.version, 'game')}>
                      {t("version.delete")}
                    </Button>
                  </div>
                </div>
              )}
              {v.has_game && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Button variant="secondary" size="md" onClick={() => setDataModalVersion(v.version)}>
                    {t("version.dataManagement")}
                  </Button>
                </div>
              )}
              {v.has_server && (
                <>
                  <div style={{ borderTop: "1px dashed var(--border-color)", margin: "4px 0" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>🖥️</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {t("version.gameServer")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button variant="primary" size="sm" onClick={() => handleLaunch(v.version, true)}>
                        {t("version.launch")}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => confirmDelete(v.version, 'server')}>
                        {t("version.delete")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {deleteInfo && (
        <div style={overlayStyle} onClick={() => setDeleteInfo(null)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "15px" }}>
              {t("version.confirmDelete", { version: deleteInfo.version, fileName: deleteInfo.fileName })}
            </h3>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <Button variant="secondary" onClick={executeDelete}>{t("common.confirm")}</Button>
              <Button variant="secondary" onClick={() => setDeleteInfo(null)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
      {dataModalVersion && (
        <DataManagerModal
            version={dataModalVersion}
            installedVersions={installed}
            onClose={() => setDataModalVersion(null)}
            showToast={showToast}
        />
      )}
    </div>
  );
}

function DataManagerModal({
  version,
  installedVersions,
  onClose,
  showToast,
}: {
  version: string;
  installedVersions: InstalledVersion[];
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const { t } = useTranslation();
  const [source, setSource] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const sourceOptions = installedVersions.filter(
    v => v.version !== version && v.has_game
  );

  const moduleOptions = ["saves", "maps", "mods", "schematics", "settings"];

  const toggleModule = (mod: string) => {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const handleCopy = async () => {
    if (!source) { showToast(t("dataManager.selectSourceWarning"), 'warning'); return; }
    if (selectedModules.length === 0) { showToast(t("dataManager.selectModulesWarning"), 'warning'); return; }
    try {
      await invoke("copy_data_between_versions", {
        sourceVersion: source,
        targetVersion: version,
        modules: selectedModules,
      });
      showToast(t("dataManager.copySuccess"), 'success');
      onClose();
    } catch (e) {
      showToast(t("dataManager.copyFailed", { error: String(e) }), 'error');
    }
  };

  const getMajor = (v: string) => parseInt(v.replace(/^v/, "").split(".")[0]) || 0;
  const sourceMajor = source ? getMajor(source) : 0;
  const targetMajor = getMajor(version);
  const isCrossMajor = sourceMajor !== targetMajor;
  const isDowngrade = sourceMajor > targetMajor;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...dialogStyle, minWidth: "420px", maxWidth: "520px", textAlign: "left", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ textAlign: "center", marginBottom: "16px", fontSize: "18px" }}>
          {t("dataManager.title", { version })}
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            {t("dataManager.selectSource")}:
          </label>
          {sourceOptions.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{t("dataManager.noSource")}</p>
          ) : (
            <select value={source} onChange={e => setSource(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text-primary)",
                fontSize: "14px",
              }}>
              <option value="">--</option>
              {sourceOptions.map(v => (
                <option key={v.version} value={v.version}>{v.version}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
            {t("dataManager.modules")}:
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {moduleOptions.map(mod => (
              <label key={mod} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                <input type="checkbox" checked={selectedModules.includes(mod)} onChange={() => toggleModule(mod)}
                  style={{ accentColor: "var(--accent)" }} />
                {t(`dataManager.${mod}`)}
              </label>
            ))}
          </div>
        </div>

        {source && (
          <div style={{ marginBottom: "16px" }}>
            {isCrossMajor && (
              <div style={{ background: "rgba(255,152,0,0.1)", border: "1px solid #ff9800", borderRadius: "4px", padding: "8px 12px", fontSize: "12px", color: "#ff9800", marginBottom: "6px" }}>
                ⚠ {t("dataManager.warningCrossMajor", { source, target: version })}
              </div>
            )}
            {isDowngrade && selectedModules.includes("saves") && (
              <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid #f44336", borderRadius: "4px", padding: "8px 12px", fontSize: "12px", color: "#f44336" }}>
                🚫 {t("dataManager.warningDowngrade", { source: sourceMajor, target: targetMajor })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button variant="primary" size="sm" onClick={handleCopy}>{t("dataManager.copy")}</Button>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 10000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const dialogStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "2px solid var(--border-color)",
  boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px var(--accent-glow)",
  padding: "24px",
  minWidth: "360px",
  maxWidth: "480px",
  textAlign: "center",
  animation: "slide-up 0.25s ease-out"
};

interface Props {
  onStartDownload: (url: string, version: string, fileName: string) => void;
  javaPath: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function VersionsPage({ onStartDownload, javaPath, showToast }: Props) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<GameVersion[]>([]);
  const [beVersions, setBeVersions] = useState<BeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("download");
  const [category, setCategory] = useState<"release" | "pre-release" | "be">("release");

  useEffect(() => {
    async function load() {
      try {
        const result = await invoke<GameVersion[]>("get_versions");
        setVersions(result);
      } catch (e) {
        console.error(e);
      }
      try {
        const beResult = await invoke<BeVersion[]>("get_be_versions");
        setBeVersions(beResult);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <div style={{ padding: "24px" }}>
        <SkeletonCard />
        <SkeletonCard lines={2} />
        <SkeletonCard />
        <SkeletonCard lines={3} />
      </div>
    );

  const releaseVersions = versions.filter((v) => !v.prerelease && /^v\d+/.test(v.version));
  const preReleaseVersions = versions.filter((v) => v.prerelease);

  const groupByMajor = (vs: GameVersion[]) => {
    const groups: Record<string, GameVersion[]> = {};
    for (const v of vs) {
      const major = v.version.replace(/^v(\d+).*/, '$1');
      if (!groups[major]) groups[major] = [];
      groups[major].push(v);
    }
    for (const major in groups) {
      groups[major].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    }
    return groups;
  };

  return (
    <div style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "16px", display: "flex", gap: "16px" }}>
        <button onClick={() => setActiveTab("download")} style={tabStyle(activeTab === "download")}>
          {t("version.available")}
        </button>
        <button onClick={() => setActiveTab("installed")} style={tabStyle(activeTab === "installed")}>
          {t("version.installed")}
        </button>
      </div>

      {activeTab === "installed" ? (
        <InstalledPage javaPath={javaPath} showToast={showToast} />
      ) : (
        <>
          <div style={{ marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {(["release", "pre-release", "be"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  background: category === cat ? "var(--accent)" : "transparent",
                  border: category === cat ? "none" : "1px solid var(--border)",
                  color: category === cat ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {cat === "release"
                  ? t("version.release")
                  : cat === "pre-release"
                  ? t("version.preRelease")
                  : t("version.be")}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
            {category === "be" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {beVersions.map((v) => {
                  const gv: GameVersion = {
                    version: `BE-${v.version}`,
                    published_at: v.published_at,
                    download_url: v.download_url,
                    server_download_url: undefined,
                    has_server: false,
                    body: "",
                    prerelease: true,
                  };
                  return (
                    <motion.div
                      key={v.version}
                      initial={{ opacity: 0, x: -60 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <VersionCard version={gv} onStartDownload={onStartDownload} showToast={showToast} />
                    </motion.div>
                  );
                })}
                {beVersions.length === 0 && <p style={{ color: "var(--text-secondary)" }}>{t("version.noBE")}</p>}
              </div>
            ) : (
              (() => {
                const current = category === "release" ? releaseVersions : preReleaseVersions;
                const grouped = groupByMajor(current);
                const majors = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));
                return majors.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>{t("version.noVersions")}</p>
                ) : (
                  majors.map((major) => (
                    <VersionGroup
                      key={major}
                      major={major}
                      versions={grouped[major]}
                      onStartDownload={onStartDownload}
                      showToast={showToast}
                    />
                  ))
                );
              })()
            )}
          </div>
        </>
      )}
    </div>
  );
}