import { useState } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, updateNodeData, runProcessNode } from "../../../stores/pipelineStore";
import { statusRunning, statusError, statusRunningBg } from "../../../utils/theme";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, fieldInput } from "./nodeStyles";

export function VideoAudioMergeNode({ node, onDragStart }) {
  const snap = useSnapshot(pipelineStore);
  const isRunning = node.data.status === "running";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={nodeShell(node, "#06b6d4", node.data.status)}>
      <NodeHeader color="#06b6d4" label="Video + Audio" status={node.data.status} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Video URL" color="#06b6d4" required />
            <input type="text" value={node.data.videoUrl || ""} onChange={(e) => updateNodeData(node.id, { videoUrl: e.target.value })} placeholder="Paste video URL..." disabled={isRunning} style={{ ...fieldInput, height: "auto" }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Audio URL" color="#06b6d4" required />
            <input type="text" value={node.data.audioUrl || ""} onChange={(e) => updateNodeData(node.id, { audioUrl: e.target.value })} placeholder="Paste audio URL..." disabled={isRunning} style={{ ...fieldInput, height: "auto" }} />
          </div>
          {node.data.error && <div style={{ fontSize: 10, color: statusError, marginTop: 4 }}>{node.data.error}</div>}
          <button onClick={() => runProcessNode(node.id)} disabled={isRunning || snap.running} style={{
            width: "100%", padding: "7px 0", borderRadius: 6, border: "none", cursor: isRunning ? "wait" : "pointer", marginTop: 6,
            background: isRunning ? statusRunningBg : "rgba(6,182,212,0.08)",
            color: isRunning ? statusRunning : "var(--text)", fontSize: 11, fontWeight: 500, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
            {isRunning ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "p-spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Merging</>) : (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Merge</>)}
          </button>
        </div>
      )}
    </div>
  );
}
