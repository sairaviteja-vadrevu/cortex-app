import { useState } from "react";
import { statusRunning, statusDone, statusError, statusRunningBorder, statusDoneBorder, statusErrorBorder } from "../../../utils/theme";

export function nodeShell(node, accentColor, status) {
  const border =
    status === "running" ? statusRunningBorder :
    status === "done" ? statusDoneBorder :
    status === "error" ? statusErrorBorder :
    "var(--surface-3)";

  return {
    position: "absolute", left: node.x, top: node.y, width: node.w,
    background: "var(--surface-1)",
    border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden",
    boxShadow: "var(--neu-shadow-sm)", zIndex: 2,
    transition: "border-color 0.3s",
  };
}

const STATUS_BADGE = {
  idle: { color: "var(--text-dim)", label: "" },
  running: { color: statusRunning, label: "Running" },
  done: { color: statusDone, label: "Done" },
  error: { color: statusError, label: "Error" },
  waiting: { color: "var(--text-dim)", label: "" },
};

export function NodeHeader({ color, label, status, onDragStart, nodeId, collapsed, onToggleCollapse }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.idle;

  return (
    <div
      data-node-drag
      onMouseDown={onDragStart ? (e) => onDragStart(e, nodeId) : undefined}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px",
        borderBottom: collapsed ? "none" : "1.5px solid var(--surface-3)",
        cursor: "grab", userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {badge.label && <span style={{ fontSize: 11, fontWeight: 500, color: badge.color }}>{badge.label}</span>}
        {status === "running" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={badge.color} strokeWidth="2.5" style={{ animation: "p-spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        )}
        {status === "done" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={badge.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        )}
        {onToggleCollapse && (
          <button onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }} onMouseDown={(e) => e.stopPropagation()} style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "transparent", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {collapsed ? <path d="M12 5v14M5 12h14" /> : <path d="M5 12h14" />}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function FieldDot({ color = "var(--text-dim)" }) {
  return <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 1 }} />;
}

export function FieldLabel({ label, color = "var(--text-dim)", required }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
      <FieldDot color={color} />
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}{required && " *"}
      </span>
    </div>
  );
}

export function HiddenProperties({ count, expanded, onToggle }) {
  return (
    <button onClick={onToggle} onMouseDown={(e) => e.stopPropagation()} style={{
      width: "100%", padding: "6px 0", marginTop: 4, background: "none", border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"
        style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 500 }}>{expanded ? "Less" : `${count} more`}</span>
    </button>
  );
}

export const nodeBody = { padding: 12 };

export const fieldInput = {
  width: "100%", resize: "none", borderRadius: 10, padding: "8px 10px",
  background: "var(--surface-0)", border: "1.5px solid var(--surface-3)", color: "var(--text)",
  fontSize: 13, fontFamily: "inherit", outline: "none", lineHeight: 1.4,
};

export const smallBtn = {
  position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%",
  background: "var(--border)", border: "none",
  color: "var(--text)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
