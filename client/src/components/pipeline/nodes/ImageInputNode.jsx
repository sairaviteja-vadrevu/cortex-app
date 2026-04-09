import { useState } from "react";
import { updateNodeData } from "../../../stores/pipelineStore";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, smallBtn } from "./nodeStyles";

export function ImageInputNode({ node, onDragStart }) {
  const [collapsed, setCollapsed] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) updateNodeData(node.id, { imageUrl: URL.createObjectURL(file) });
  };

  return (
    <div style={nodeShell(node, "#f97316", node.data.status)}>
      <NodeHeader color="#f97316" label="Image Input" status={node.data.status || "idle"} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <FieldLabel label="Attachment" color="#f97316" />
          {node.data.imageUrl ? (
            <div style={{ position: "relative" }}>
              <img src={node.data.imageUrl} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6 }} />
              <button onClick={() => updateNodeData(node.id, { imageUrl: "" })} style={smallBtn}>x</button>
            </div>
          ) : (
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: 100, borderRadius: 6, border: "1.5px dashed var(--surface-3)",
              cursor: "pointer", color: "var(--text-dim)", fontSize: 11, gap: 4,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Drop image or click
              <input type="file" accept="image/*" onChange={handleFile} hidden />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
