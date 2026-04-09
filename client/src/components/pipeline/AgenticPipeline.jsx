import { useState, useRef } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, sendMessage } from "../../stores/pipelineStore";
import { useBlockPinchZoom } from "./hooks/useBlockPinchZoom";
import { Toolbar } from "./Toolbar";
import { PipelineCanvas } from "./PipelineCanvas";
import { ChatPanel } from "./chat/ChatPanel";
import { Toggle } from "./shared/Toggle";
import { AssetPicker } from "./chat/AssetPicker";

const QUICK_ACTIONS = [
  { label: "Product photoshoot", prompt: "Product photoshoot: Professional studio shot of my product with cinematic lighting" },
  { label: "Character turnaround", prompt: "Character turnaround: Generate multiple angle views of a character" },
  { label: "Video ad", prompt: "Video ad: Create a 5-second promotional video ad" },
  { label: "Background swap", prompt: "Background swap: Replace the background of my image" },
  { label: "Style transfer", prompt: "Style transfer: Apply the visual style from one image to another" },
  { label: "Merge videos", prompt: "Merge videos: Combine two video clips into one" },
];

function HeroLanding({ onSend }) {
  const [segments, setSegments] = useState([{ type: "text", value: "" }]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const inputRefs = useRef({});
  const fileRef = useRef(null);
  const getAllText = () => segments.filter((s) => s.type === "text").map((s) => s.value).join(" ").trim();
  const getAllImages = () => segments.filter((s) => s.type === "image");
  const hasContent = segments.some((s) => (s.type === "text" && s.value.trim()) || s.type === "image");
  const [activeSegIdx, setActiveSegIdx] = useState(0);

  const handleTextChange = (idx, val) => { setSegments((prev) => prev.map((s, i) => i === idx ? { ...s, value: val } : s)); setActiveSegIdx(idx); const atMatch = val.match(/@(\S*)$/); if (atMatch) { setShowPicker(true); setPickerQuery(atMatch[1]); } else { setShowPicker(false); setPickerQuery(""); } };
  const handleAssetSelect = (img) => { setShowPicker(false); setSegments((prev) => { const result = []; for (let i = 0; i < prev.length; i++) { if (i === activeSegIdx && prev[i].type === "text") { const t = prev[i].value.replace(/@\S*$/, ""); if (t) result.push({ type: "text", value: t }); result.push({ type: "image", url: img.url, name: img.name }); result.push({ type: "text", value: " " }); } else { result.push(prev[i]); } } return result; }); setTimeout(() => { const k = Object.keys(inputRefs.current).map(Number).sort((a, b) => a - b); if (k.length) inputRefs.current[k[k.length - 1]]?.focus(); }, 50); };
  const handleFileUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; setSegments((prev) => [...prev, { type: "image", url: URL.createObjectURL(f), name: f.name }, { type: "text", value: " " }]); setTimeout(() => { const k = Object.keys(inputRefs.current).map(Number).sort((a, b) => a - b); if (k.length) inputRefs.current[k[k.length - 1]]?.focus(); }, 50); };
  const removeImage = (idx) => { setSegments((prev) => { const result = prev.filter((_, i) => i !== idx); const merged = []; for (const s of result) { if (s.type === "text" && merged.length > 0 && merged[merged.length - 1].type === "text") merged[merged.length - 1].value += s.value; else merged.push({ ...s }); } return merged.length ? merged : [{ type: "text", value: "" }]; }); };
  const handleSend = () => { if (!hasContent) return; const images = getAllImages(); onSend(getAllText() || "Generate a stylish product image", images.length > 0 ? { url: images[0].url, name: images[0].name } : null, images.length > 1 ? images : undefined); setSegments([{ type: "text", value: "" }]); };
  const handleKeyDown = (e, idx) => { if (e.key === "Enter" && !showPicker) { e.preventDefault(); handleSend(); } if (e.key === "Escape" && showPicker) setShowPicker(false); if (e.key === "Backspace" && segments[idx]?.type === "text" && !segments[idx].value && idx > 0 && segments[idx - 1]?.type === "image") { e.preventDefault(); removeImage(idx - 1); } };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ color: "var(--text)", fontSize: 32, fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 8 }}>
          Describe it. <span style={{ fontWeight: 700, color: "var(--accent)" }}>We'll build it.</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 400 }}>Add images, pick models, let the agent handle the rest.</p>
      </div>

      <div style={{ width: "100%", maxWidth: 560, position: "relative" }}>
        {showPicker && <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 8, zIndex: 50 }}><AssetPicker query={pickerQuery} onSelect={handleAssetSelect} onClose={() => setShowPicker(false)} /></div>}

        <div style={{ background: "var(--surface-1)", border: `2px solid ${hasContent ? "var(--accent)" : "var(--surface-3)"}`, borderRadius: 16, padding: "14px 16px", boxShadow: "var(--neu-shadow)", transition: "border-color 0.2s" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0, minHeight: 32 }}>
            {segments.map((seg, i) => {
              if (seg.type === "image") return (
                <div key={`img-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px 3px 3px", borderRadius: 8, margin: "2px", background: "var(--surface-0)", border: "1.5px solid var(--surface-3)" }}>
                  <img src={seg.url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                  <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.name.length > 14 ? seg.name.slice(0, 12) + "..." : seg.name}</span>
                  <button onClick={() => removeImage(i)} style={{ width: 14, height: 14, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-dim)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                </div>
              );
              const isLast = i === segments.length - 1, isOnly = segments.length === 1;
              return <input key={`txt-${i}`} ref={(el) => { if (el) inputRefs.current[i] = el; }} value={seg.value} onChange={(e) => handleTextChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(e, i)} placeholder={isOnly ? "Describe what to generate, @ to attach..." : ""} style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 15, fontFamily: "inherit", padding: "3px 0", margin: 0, width: isOnly ? "100%" : Math.max(seg.value.length * 9 + 4, isLast ? 140 : 4), minWidth: isLast ? 140 : 4, flex: isLast ? 1 : "none" }} />;
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => fileRef.current?.click()} style={toolBtnStyle} title="Upload"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} hidden />
              <button onClick={() => { setSegments((prev) => { const l = prev[prev.length - 1]; if (l?.type === "text") return prev.map((s, i) => i === prev.length - 1 ? { ...s, value: s.value + "@" } : s); return [...prev, { type: "text", value: "@" }]; }); setActiveSegIdx(segments.length - 1); setShowPicker(true); setPickerQuery(""); }} style={toolBtnStyle} title="Reference (@)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button>
            </div>
            <button onClick={handleSend} disabled={!hasContent} style={{ padding: "8px 22px", borderRadius: 10, border: hasContent ? "2px solid var(--border)" : "2px solid var(--surface-3)", cursor: hasContent ? "pointer" : "default", background: hasContent ? "var(--accent)" : "var(--surface-0)", color: hasContent ? "var(--accent-text)" : "var(--text-dim)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", boxShadow: hasContent ? "var(--neu-shadow-sm)" : "none" }}>
              Generate <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} onClick={() => { setSegments([{ type: "text", value: a.prompt }]); setTimeout(() => { const k = Object.keys(inputRefs.current).map(Number).sort((a, b) => a - b); if (k.length) inputRefs.current[k[k.length - 1]]?.focus(); }, 50); }} style={{
              padding: "7px 14px", borderRadius: 10, border: "2px solid var(--surface-3)", background: "var(--surface-1)",
              color: "var(--text-muted)", fontSize: 13, fontWeight: 400, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s", boxShadow: "var(--neu-shadow-sm)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const toolBtnStyle = { width: 34, height: 34, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export function AgenticPipeline() {
  useBlockPinchZoom();
  const snap = useSnapshot(pipelineStore);
  const [agentOn, setAgentOn] = useState(true);
  const showHero = snap.nodes.length === 0 && snap.messages.length === 0 && !snap.questionnaire;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <Toolbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}><PipelineCanvas />{showHero && <HeroLanding onSend={sendMessage} />}</div>
        {agentOn ? (
          <ChatPanel toggleOn={agentOn} onToggle={() => !snap.running && setAgentOn(false)} />
        ) : (
          <div style={{ width: 44, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface-1)", borderLeft: "2px solid var(--border)", padding: "12px 0", gap: 10 }}>
            <Toggle on={agentOn} onToggle={() => setAgentOn(true)} disabled={snap.running} />
            <div style={{ writingMode: "vertical-rl", color: "var(--text-dim)", fontSize: 11, fontWeight: 500 }}>Off</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgenticPipeline;
