import { useState } from "react";

interface Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  hoverScale?: boolean;
  style?: React.CSSProperties;
  angled?: boolean;
}

export default function Button({
  children,
  variant = "secondary",
  onClick,
  disabled,
  size = "md",
  hoverScale = false,
  style,
  angled = false
}: Props) {
  const [hover, setHover] = useState(false);

  const baseStyle: React.CSSProperties = {
    padding: size === "sm" ? "4px 12px" : "8px 16px",
    background: variant === "primary" ? "var(--accent)" : "transparent",
    border: `2px solid ${variant === "primary" ? "var(--accent)" : "var(--border-color)"}`,
    color: variant === "primary" ? "#fff" : "var(--text-primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: size === "sm" ? "11px" : "13px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    clipPath: angled ? "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" : "none",
    transition: "all 0.15s ease-out",
    opacity: disabled ? 0.6 : 1,
    transform: hover && !disabled && hoverScale ? "scale(1.02)" : "scale(1)",
    ...(hover && !disabled
      ? {
          background: variant === "primary" ? "var(--accent-hover)" : "var(--bg-tertiary)",
          borderColor: variant === "primary" ? "var(--accent-hover)" : "var(--accent)",
          boxShadow: variant === "primary" ? "0 0 12px var(--accent-glow)" : "var(--shadow-glow)",
        }
      : {}),
    ...style,
  };

  return (
    <button
      style={baseStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}