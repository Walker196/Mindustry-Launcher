import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import type { JavaConfig } from "../types";

interface Props {
  javaConfig: JavaConfig;
  scanning: boolean;
  onDetect: () => void;
  onSelectJava: (path: string) => void;
}

export default function SettingsPage({ javaConfig, scanning, onDetect, onSelectJava }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "16px", fontSize: "15px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "2px solid var(--border-color)", paddingBottom: "8px" }}>
        {t("java.title")}
      </h2>

      <Button variant="primary" onClick={onDetect} disabled={scanning}>
        {scanning ? t("java.scanning") : t("java.scan")}
      </Button>

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {javaConfig.jdks.length > 0 ? (
          javaConfig.jdks.map((jdk, index) => {
            const isSelected = jdk.path === javaConfig.selected_path;
            return (
              <div key={index} style={{
                background: isSelected ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                border: isSelected ? "2px solid var(--accent)" : "2px solid var(--border-color)",
                boxShadow: isSelected ? "4px 4px 0px rgba(0,0,0,0.5), 0 0 10px var(--accent-glow)" : "4px 4px 0px rgba(0,0,0,0.4)",
                padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s ease-out",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "0.5px" }}>
                    JDK {jdk.version}
                    {isSelected && <span style={{ marginLeft: "10px", fontSize: "10px", color: "var(--accent)", textTransform: "uppercase" }}>● {t("java.currentInUse")}</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{jdk.path}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t("java.source")}: {jdk.source}</div>
                </div>
                {!isSelected && (
                  <Button variant="secondary" size="sm" onClick={() => onSelectJava(jdk.path)}>
                    {t("java.select")}
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          !scanning && <p style={{ color: "var(--text-muted)" }}>{t("java.notFound")}</p>
        )}
      </div>
    </div>
  );
}