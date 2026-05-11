import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function ConfirmDialog({ dialog, onClose }: {
  dialog: { message: string; onConfirm: () => void; onCancel?: () => void };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10001,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "360px",
          maxWidth: "440px",
          textAlign: "center",
          boxShadow: "var(--shadow)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontSize: "15px", color: "var(--text-primary)", marginBottom: "20px", lineHeight: 1.6 }}>
          {dialog.message}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            style={{
              padding: "8px 24px",
              background: "var(--accent)",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {t("common.confirm")}
          </button>
          <button
            onClick={() => {
              dialog.onCancel?.();
              onClose();
            }}
            style={{
              padding: "8px 24px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}