import { useState } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, VIDEO_MODELS, updateNodeData, runProcessNode } from "../../../stores/pipelineStore";
import { statusRunning, statusError, statusRunningBg } from "../../../utils/theme";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, HiddenProperties, fieldInput } from "./nodeStyles";

export function VideoProcessNode({ node, onDragStart }) {
  const snap = useSnapshot(pipelineStore);
  const isRunning = node.data.status === "running";
  const [collapsed, setCollapsed] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  return (
    <div style={nodeShell(node, "#ec4899", node.data.status)}>
      <NodeHeader color="#ec4899" label={node.data.modelLabel || "Video Process"} status={node.data.status} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Prompt" required />
            <textarea value={node.data.prompt} onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })} placeholder="Describe video motion..." disabled={isRunning} style={{ ...fieldInput, height: 40 }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Model" />
            <select value={node.data.model} onChange={(e) => { const mdl = VIDEO_MODELS.find((m) => m.id === e.target.value); updateNodeData(node.id, { model: e.target.value, modelLabel: mdl?.label || e.target.value }); }} style={{ ...fieldInput, height: "auto", padding: "5px 6px", cursor: "pointer" }}>
              {VIDEO_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 4 }}>
            <FieldLabel label="Duration" />
            <select value={node.data.duration || "5"} onChange={(e) => updateNodeData(node.id, { duration: e.target.value })} style={{ ...fieldInput, height: "auto", padding: "5px 6px", cursor: "pointer" }}>
              <option value="5">5s</option><option value="10">10s</option>
            </select>
          </div>
          <HiddenProperties count={2} expanded={showHidden} onToggle={() => setShowHidden(!showHidden)} />
          {showHidden && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1.5px solid var(--surface-3)" }}>
              <div style={{ marginBottom: 6 }}><FieldLabel label="Negative Prompt" /><input type="text" value={node.data.negativePrompt || ""} onChange={(e) => updateNodeData(node.id, { negativePrompt: e.target.value })} placeholder="Negative prompt" style={{ ...fieldInput, height: "auto" }} /></div>
              <div style={{ marginBottom: 2 }}><FieldLabel label="Aspect Ratio" /><div style={{ display: "flex", gap: 2 }}>{["16:9", "9:16", "1:1"].map((r) => (<button key={r} onClick={() => updateNodeData(node.id, { videoRatio: r })} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: (node.data.videoRatio || "16:9") === r ? "#ec4899" : "var(--surface-0)", color: (node.data.videoRatio || "16:9") === r ? "#fff" : "var(--text-muted)" }}>{r}</button>))}</div></div>
            </div>
          )}
          {node.data.error && <div style={{ fontSize: 10, color: statusError, marginTop: 4 }}>{node.data.error}</div>}
          <button onClick={() => runProcessNode(node.id)} disabled={isRunning || snap.running} style={{
            width: "100%", padding: "7px 0", borderRadius: 6, border: "none", cursor: isRunning ? "wait" : "pointer", marginTop: 6,
            background: isRunning ? statusRunningBg : "rgba(236,72,153,0.08)",
            color: isRunning ? statusRunning : "var(--text)", fontSize: 11, fontWeight: 500, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
            {isRunning ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "p-spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Generating</>) : (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>Process</>)}
          </button>
        </div>
      )}
    </div>
  );
}
