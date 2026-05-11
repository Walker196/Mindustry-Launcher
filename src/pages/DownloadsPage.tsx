import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import type { DownloadTask } from "../types";

interface Props {
  tasks: DownloadTask[];
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function DownloadsPage({ tasks, onCancel, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
      <h2 style={{
        marginBottom: "16px",
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        borderBottom: "2px solid var(--border-color)",
        paddingBottom: "8px"
      }}>
        {t("sidebar.downloads")}
      </h2>
      {tasks.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{t("download.empty")}</p>
      ) : (
        <AnimatePresence>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {tasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.3 } }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  background: "var(--bg-secondary)",
                  border: "2px solid var(--border-color)",
                  boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.4)",
                  padding: "14px 18px",
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  alignItems: "center"
                }}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    letterSpacing: "0.5px",
                    color: "var(--text-primary)"
                  }}>
                    {task.fileName}
                    <span style={{ color: "var(--text-muted)", marginLeft: "8px", fontSize: "11px" }}>
                      {task.version}
                    </span>
                  </span>
                  <span style={{
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                    color: task.status === "error" ? "var(--danger)" :
                          task.status === "completed" ? "var(--success)" :
                          "var(--accent)"
                  }}>
                    {task.status === "downloading"
                      ? `${task.speed ? task.speed + "    " : ""}${Math.round(task.progress * 100)}%`
                      : task.status === "completed"
                      ? t("download.completed")
                      : t("download.failed")}
                  </span>
                </div>
                <div style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  height: "8px",
                  overflow: "hidden",
                  marginBottom: task.status === "downloading" ? "10px" : "0"
                }}>
                  <div style={{
                    width: `${task.progress * 100}%`,
                    height: "100%",
                    background: task.status === "error"
                      ? "var(--danger)"
                      : "linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 50%, var(--accent) 100%)",
                    backgroundSize: "200% 100%",
                    animation: task.status === "downloading" ? "shimmer 1.2s infinite linear" : "none",
                    transition: "width 0.2s",
                  }} />
                </div>

                {task.errorMsg && (
                  <p style={{
                    color: "var(--danger)",
                    fontSize: "11px",
                    marginTop: "6px",
                    fontFamily: "'Mindustry', monospace",
                    opacity: 0.9
                  }}>
                    {task.errorMsg}
                  </p>
                )}

                {task.status === "downloading" && (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => onCancel(task.id)}
                      style={{
                        padding: "4px 12px",
                        background: "transparent",
                        border: "2px solid var(--border-color)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                        transition: "all 0.15s ease-out"
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                )}
                {task.status === "error" && (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button 
                      onClick={() => onDismiss(task.id)}
                      style={{
                        padding: "4px 12px",
                        background: "transparent",
                        border: "2px solid var(--border-color)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                        transition: "all 0.15s ease-out"
                      }}>
                      ✕
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}