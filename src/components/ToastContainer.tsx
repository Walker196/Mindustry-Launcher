import type {Toast} from "../types/index"
import { AnimatePresence, motion } from "framer-motion";

export default function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{
      position: "fixed",
      top: "60px",
      right: "20px",
      zIndex: 10001,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      pointerEvents: "none",
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              border: "2px solid",
              borderColor: toast.type === 'success' ? "var(--success)" :
                          toast.type === 'error' ? "var(--danger)" :
                          toast.type === 'warning' ? "var(--warning)" :
                          "var(--accent)",
              boxShadow: toast.type === 'success' ? "4px 4px 0px rgba(0,0,0,0.5), 0 0 8px var(--success-glow)" :
                         toast.type === 'error' ? "4px 4px 0px rgba(0,0,0,0.5), 0 0 8px var(--danger-glow)" :
                         toast.type === 'warning' ? "4px 4px 0px rgba(0,0,0,0.5), 0 0 8px var(--warning-glow)" :
                         "4px 4px 0px rgba(0,0,0,0.5), 0 0 8px var(--accent-glow)",
              padding: "10px 20px",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}