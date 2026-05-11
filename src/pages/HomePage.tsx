import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import Button from "../components/Button";
import type { PlayRecord, InstalledVersion } from "../types";

interface Props {
  javaPath: string | null;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function HomePage({ javaPath, showToast }: Props) {
  const { t } = useTranslation();
  const [lastPlay, setLastPlay] = useState<PlayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasServer, setHasServer] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [record, installed] = await Promise.all([
          invoke<PlayRecord | null>("load_play_record"),
          invoke<InstalledVersion[]>("get_installed_versions"),
        ]);
        if (record) {
          const ver = installed.find((v) => v.version === record.version);
          if (ver && ver.has_game) {
            setLastPlay(record);
            setHasServer(ver.has_server);
          } else {
            setLastPlay(null);
            setHasServer(false);
          }
        }
      } catch {

      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleContinue = async () => {
    if (!javaPath) {
      showToast(t("java.notFound"), 'info');
      return;
    }
    if (!lastPlay) return;
    try {
      await invoke("launch_game", { version: lastPlay.version, javaPath });
      showToast(t("version.launchSuccess"), 'success');
    } catch (e) {
      showToast(t("version.launchFailed", { error: String(e) }), 'error');
    }
  };

  const handleNavToVersions = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "versions" }));
  };

  if (loading) return <div style={{ padding: "40px" }}>{t("common.loading")}</div>;

  return (
    <div style={{ padding: "48px", maxWidth: "560px" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.5px" }}>
          {t("app.title")}
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {t("app.subtitle")}
        </p>
      </div>

      {lastPlay ? (
        <div
          style={{
            background: "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "120px",
              height: "120px",
              background: "var(--accent)",
              opacity: 0.08,
              borderRadius: "50%",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              {t("home.lastPlayed")}
            </p>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "6px",
                color: "var(--text-primary)",
              }}
            >
              {lastPlay.version}
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              {new Date(lastPlay.timestamp).toLocaleString(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <Button variant="primary" size="md" hoverScale onClick={handleContinue}>
              <span style={{ fontSize: "18px" }}>▶</span> {t("home.continue")}
            </Button>

            {hasServer && (
              <button
                onClick={async () => {
                  if (!javaPath) {
                    showToast(t("java.notFound"), 'info');
                    return;
                  }
                  try {
                    await invoke("launch_game", { version: lastPlay.version, javaPath });
                    showToast(t("version.launchSuccess"), 'success');
                  } catch (e) {
                    showToast(t("version.launchFailed", { error: String(e) }), 'error');
                  }
                }}
                style={{
                  padding: "8px 20px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  marginTop: "8px",
                  width: "100%",
                }}
              >
                🖥️ {t("version.gameServer")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px dashed var(--border)",
            borderRadius: "14px",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.6 }}>🎮</div>
          <p style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "8px", fontWeight: 600 }}>
            {t("home.noRecord")}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            {t("home.noRecordHint")}
          </p>
          <Button variant="primary" onClick={handleNavToVersions}>
            {t("home.goToVersions")}
          </Button>
        </div>
      )}
    </div>
  );
}