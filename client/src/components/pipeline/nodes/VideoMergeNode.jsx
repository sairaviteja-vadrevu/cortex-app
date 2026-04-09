import { useState } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, updateNodeData, runProcessNode } from "../../../stores/pipelineStore";
import { statusRunning, statusError, statusRunningBg } from "../../../utils/theme";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, fieldInput } from "./nodeStyles";

export function VideoMergeNode({ node, onDragStart }) {
  const snap = useSnapshot(pipelineStore);
  const isRunning = node.data.status === "running";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={nodeShell(node, "#8b5cf6", node.data.status)}>
      <NodeHeader color="#8b5cf6" label="Video Merge" status={node.data.status} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Video 1 URL" color="#8b5cf6" required />
            <input type="text" value={node.data.video1Url || ""} onChange={(e) => updateNodeData(node.id, { video1Url: e.target.value })} placeholder="Paste video URL or connect upstream..." disabled={isRunning} style={{ ...fieldInput, height: "auto" }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Video 2 URL" color="#8b5cf6" required />
            <input type="text" value={node.data.video2Url || ""} onChange={(e) => updateNodeData(node.id, { video2Url: e.target.value })} placeholder="Paste video URL or connect upstream..." disabled={isRunning} style={{ ...fieldInput, height: "auto" }} />
          </div>
          {node.data.error && <div style={{ fontSize: 10, color: statusError, marginTop: 4 }}>{node.data.error}</div>}
          <button onClick={() => runProcessNode(node.id)} disabled={isRunning || snap.running} style={{
            width: "100%", padding: "7px 0", borderRadius: 6, border: "none", cursor: isRunning ? "wait" : "pointer", marginTop: 6,
            background: isRunning ? statusRunningBg : "rgba(139,92,246,0.08)",
            color: isRunning ? statusRunning : "var(--text)", fontSize: 11, fontWeight: 500, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
            {isRunning ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "p-spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Merging</>) : (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6l4 4 4-4M8 18l4-4 4 4"/></svg>Merge</>)}
          </button>
        </div>
      )}
    </div>
  );
}
