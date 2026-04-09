import { useState, useRef } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, IMAGE_MODELS, IMAGE_SIZES, RESOLUTIONS, OUTPUT_FORMATS, updateNodeData, runProcessNode } from "../../../stores/pipelineStore";
import { statusRunning, statusError, statusRunningBg } from "../../../utils/theme";
import { nodeShell, NodeHeader, nodeBody, FieldLabel, HiddenProperties, fieldInput } from "./nodeStyles";

export function ProcessNode({ node, onDragStart }) {
  const snap = useSnapshot(pipelineStore);
  const isRunning = node.data.status === "running";
  const [collapsed, setCollapsed] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const imgInputRef = useRef(null);

  const handleImagePrompt = (e) => {
    const file = e.target.files?.[0];
    if (file) updateNodeData(node.id, { imagePromptUrl: URL.createObjectURL(file) });
  };

  return (
    <div style={{ ...nodeShell(node, "#a855f7", node.data.status), minHeight: "auto", height: "auto" }}>
      <NodeHeader color="#a855f7" label={node.data.modelLabel || "Image Process"} status={node.data.status} onDragStart={onDragStart} nodeId={node.id} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div style={nodeBody}>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Prompt" required />
            <textarea value={node.data.prompt} onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })} placeholder="Describe what to generate..." disabled={isRunning} style={{ ...fieldInput, height: 44 }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Image Prompt" />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="text" value={node.data.imagePromptUrl || ""} onChange={(e) => updateNodeData(node.id, { imagePromptUrl: e.target.value })} placeholder="Image URL" style={{ ...fieldInput, height: "auto", flex: 1 }} />
              <button onClick={() => imgInputRef.current?.click()} style={{ width: 28, height: 28, borderRadius: 5, border: "1.5px solid var(--surface-3)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImagePrompt} hidden />
            </div>
            {node.data.imagePromptUrl && (
              <div style={{ marginTop: 3, position: "relative", borderRadius: 5, overflow: "hidden" }}>
                <img src={node.data.imagePromptUrl} alt="" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 5 }} />
                <button onClick={() => updateNodeData(node.id, { imagePromptUrl: "" })} style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "var(--border)", border: "none", color: "var(--text)", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Model" />
            <select value={node.data.model} onChange={(e) => { const mdl = IMAGE_MODELS.find((m) => m.id === e.target.value); updateNodeData(node.id, { model: e.target.value, modelLabel: mdl?.label || e.target.value }); }} style={{ ...fieldInput, height: "auto", padding: "5px 6px", cursor: "pointer" }}>
              {IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel label="Size" />
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {IMAGE_SIZES.map((s) => (
                <button key={s.id} onClick={() => updateNodeData(node.id, { ratio: s.id })} style={{
                  padding: "3px 7px", borderRadius: 4, fontSize: 9, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: node.data.ratio === s.id ? "#a855f7" : "var(--surface-0)", color: node.data.ratio === s.id ? "#fff" : "var(--text-muted)",
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          <HiddenProperties count={5} expanded={showHidden} onToggle={() => setShowHidden(!showHidden)} />
          {showHidden && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1.5px solid var(--surface-3)" }}>
              <div style={{ marginBottom: 6 }}><FieldLabel label="Negative Prompt" /><input type="text" value={node.data.negativePrompt || ""} onChange={(e) => updateNodeData(node.id, { negativePrompt: e.target.value })} placeholder="Negative prompt" style={{ ...fieldInput, height: "auto" }} /></div>
              <div style={{ marginBottom: 6 }}><FieldLabel label="Resolution" /><select value={node.data.resolution} onChange={(e) => updateNodeData(node.id, { resolution: e.target.value })} style={{ ...fieldInput, height: "auto", padding: "5px 6px", cursor: "pointer" }}>{RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <FieldLabel label="Prompt Expansion" />
                <button onClick={() => updateNodeData(node.id, { enablePromptExpansion: !node.data.enablePromptExpansion })} style={{ width: 24, height: 12, borderRadius: 6, border: "none", cursor: "pointer", backgroundColor: node.data.enablePromptExpansion ? "#a855f7" : "var(--surface-3)", position: "relative", transition: "background-color 0.2s" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent-text)", position: "absolute", top: 2, left: node.data.enablePromptExpansion ? 14 : 2, transition: "left 0.2s" }} />
                </button>
              </div>
              <div style={{ marginBottom: 6 }}><FieldLabel label="Seed" /><input type="number" value={node.data.seed || ""} onChange={(e) => updateNodeData(node.id, { seed: e.target.value })} placeholder="Random" style={{ ...fieldInput, height: "auto" }} /></div>
              <div style={{ marginBottom: 6 }}><FieldLabel label="Num Images" /><input type="number" value={node.data.numImages || 1} onChange={(e) => updateNodeData(node.id, { numImages: Math.max(1, parseInt(e.target.value) || 1) })} min={1} max={4} style={{ ...fieldInput, height: "auto" }} /></div>
              <div style={{ marginBottom: 2 }}><FieldLabel label="Format" /><div style={{ display: "flex", gap: 2 }}>{OUTPUT_FORMATS.map((f) => (<button key={f.id} onClick={() => updateNodeData(node.id, { outputFormat: f.id })} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: (node.data.outputFormat || "png") === f.id ? "#a855f7" : "var(--surface-0)", color: (node.data.outputFormat || "png") === f.id ? "#fff" : "var(--text-muted)" }}>{f.label}</button>))}</div></div>
            </div>
          )}
          {node.data.error && <div style={{ fontSize: 10, color: statusError, marginTop: 4 }}>{node.data.error}</div>}
          <button onClick={() => runProcessNode(node.id)} disabled={isRunning || snap.running} style={{
            width: "100%", padding: "7px 0", borderRadius: 6, border: "none",
            cursor: isRunning ? "wait" : "pointer", marginTop: 6,
            background: isRunning ? statusRunningBg : "rgba(168,85,247,0.08)",
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
