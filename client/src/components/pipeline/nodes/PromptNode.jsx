import { useState } from "react";
import { updateNodeData } from "../../../stores/pipelineStore";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, fieldInput } from "./nodeStyles";

export function PromptNode({ node, onDragStart }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={nodeShell(node, "#eab308", node.data.status)}>
      <NodeHeader color="#eab308" label="Prompt" status={node.data.status || "idle"} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <FieldLabel label="Text" color="#eab308" required />
          <textarea value={node.data.prompt} onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })} placeholder="Enter your prompt..." style={{ ...fieldInput, height: 44 }} />
        </div>
      )}
    </div>
  );
}
