import { cn } from "../../utils/cn";

export function Tabs({ tabs, active, onChange }) {
  return (
    <div
      className="flex gap-1 p-1"
      style={{ background: "var(--surface-0)", borderRadius: 10, border: "2px solid var(--border)" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
            active === tab.id
              ? ""
              : "text-[var(--text-muted)] hover:text-[var(--text)]",
          )}
          style={active === tab.id ? {
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "2px solid var(--border)",
            boxShadow: "var(--neu-shadow-sm)",
          } : {
            background: "transparent",
            border: "2px solid transparent",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
