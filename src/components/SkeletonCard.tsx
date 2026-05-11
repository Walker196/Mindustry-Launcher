export default function SkeletonCard({ lines = 1 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "2px solid var(--border-color)",
        boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.4)",
        padding: "14px 18px",
        marginBottom: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
      }}
    >
      <div style={{ width: "30%", height: "12px", background: "var(--border-color)" }} />
      <div style={{ width: "50%", height: "10px", background: "var(--border-color)" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ width: "20%", height: "10px", background: "var(--border-color)" }} />
      ))}
    </div>
  );
}