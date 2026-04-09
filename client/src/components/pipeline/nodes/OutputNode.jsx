import { useState } from "react";
import { chainFromOutput } from "../../../stores/pipelineStore";
import { statusRunning, statusDone, statusError } from "../../../utils/theme";
import { nodeShell, NodeHeader, nodeBody } from "./nodeStyles";

function ChainButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} onMouseDown={(e) => e.stopPropagation()} style={{
      flex: 1, padding: "5px 3px", borderRadius: 4, border: "2px solid var(--surface-3)",
      background: "transparent", cursor: "pointer", fontFamily: "inherit",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-3)"; }}
    >
      <span style={{ color: "#6366f1" }}>{icon}</span>
      <span style={{ color: "var(--text-dim)", fontSize: 8, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

export function OutputNode({ node, onDragStart }) {
  const isRunning = node.data.status === "running";
  const isDone = node.data.status === "done" && node.data.url;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={nodeShell(node, statusDone, node.data.status)}>
      <NodeHeader color={statusDone} label={node.data.label || "Output"} status={node.data.status} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <div style={{ width: "100%", minHeight: 140, borderRadius: 6, overflow: "hidden", background: "var(--surface-0)", border: "1.5px solid var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isRunning && (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 16 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={statusRunning} strokeWidth="2" style={{ animation: "p-spin 1.2s linear infinite", marginBottom: 6 }}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                <div style={{ fontSize: 10 }}>Generating</div>
              </div>
            )}
            {isDone && node.data.type === "image" && <img src={node.data.url} alt="Generated" style={{ width: "100%", height: "auto", maxHeight: 280, objectFit: "contain", display: "block" }} />}
            {isDone && node.data.type === "video" && <video src={node.data.url} controls autoPlay muted loop style={{ width: "100%", height: "auto", maxHeight: 260, objectFit: "contain", display: "block", background: "var(--border)" }} />}
            {!isRunning && !isDone && node.data.status !== "error" && (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 16 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 4 }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <div style={{ fontSize: 10 }}>Waiting</div>
              </div>
            )}
            {node.data.status === "error" && <div style={{ textAlign: "center", color: statusError, fontSize: 10, padding: 16 }}>Failed</div>}
          </div>
          {isDone && node.data.type === "image" && (
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              <ChainButton icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} label="Edit" onClick={() => chainFromOutput(node.id, "edit")} />
              <ChainButton icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/></svg>} label="Video" onClick={() => chainFromOutput(node.id, "video")} />
              <ChainButton icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>} label="Ref" onClick={() => chainFromOutput(node.id, "reference")} />
            </div>
          )}
          {isDone && node.data.type === "video" && (
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              <ChainButton icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6l4 4 4-4M8 18l4-4 4 4"/></svg>} label="Merge" onClick={() => chainFromOutput(node.id, "merge")} />
              <ChainButton icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>} label="Add Audio" onClick={() => chainFromOutput(node.id, "addAudio")} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
