import { cn } from "../../utils/cn";

const baseStyle = { borderRadius: 10, border: "3px solid var(--border)", transition: "all 0.15s ease" };

const variantStyles = {
  primary: { background: "var(--accent)", boxShadow: "var(--neu-shadow-sm)", color: "var(--accent-text)" },
  secondary: { background: "var(--surface-1)", boxShadow: "var(--neu-shadow-sm)", color: "var(--text)" },
  danger: { background: "var(--accent-secondary)", boxShadow: "var(--neu-shadow-sm)", color: "var(--accent-text)" },
  ghost: { background: "transparent", boxShadow: "none", border: "none", color: "var(--text-muted)" },
};

const variants = {
  primary: "text-[var(--accent-text)] font-bold hover:translate-x-[1px] hover:translate-y-[1px]",
  secondary: "text-[var(--text)] font-semibold hover:translate-x-[1px] hover:translate-y-[1px]",
  danger: "text-[var(--accent-text)] font-bold hover:translate-x-[1px] hover:translate-y-[1px]",
  ghost: "text-[var(--text-muted)] hover:text-[var(--text)]",
};

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
  icon: "p-2.5",
};

export function Button({ children, variant = "primary", size = "md", className, style: userStyle, ...props }) {
  const hoverShadow = variant !== "ghost" ? "var(--neu-shadow-hover)" : "none";
  return (
    <button
      className={cn("font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2", variants[variant], sizes[size], className)}
      style={{ ...baseStyle, ...variantStyles[variant], ...userStyle }}
      onMouseEnter={(e) => { if (variant !== "ghost") e.currentTarget.style.boxShadow = hoverShadow; }}
      onMouseLeave={(e) => { if (variant !== "ghost") e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow; }}
      {...props}
    >{children}</button>
  );
}
