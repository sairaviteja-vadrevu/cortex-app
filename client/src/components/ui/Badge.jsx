import { cn } from "../../utils/cn";

const variants = {
  default: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]",
  success: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  warning: "bg-[#eab30820] text-[#eab308] border-[#eab30840]",
  info: "bg-[var(--accent-tertiary)/8] text-[var(--accent-tertiary)] border-[var(--accent-tertiary)]",
  error: "bg-[var(--accent-secondary)/8] text-[var(--accent-secondary)] border-[var(--accent-secondary)]",
};

export function Badge({ children, variant = "default", className }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-md border-2", variants[variant], className)}>
      {children}
    </span>
  );
}
