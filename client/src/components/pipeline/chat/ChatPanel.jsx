import { useState, useRef, useEffect } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, sendMessage, clearChat, reRunPipeline, answerQuestion, submitQuestionnaire, skipQuestionnaire } from "../../../stores/pipelineStore";
import { statusRunning, statusDone, statusError } from "../../../utils/theme";
import { Toggle } from "../shared/Toggle";
import { ChatMessage } from "./ChatMessage";
import { AssetPicker } from "./AssetPicker";

export function ChatPanel({ toggleOn, onToggle }) {
  const snap = useSnapshot(pipelineStore);
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [snap.messages.length, snap.isAgentTyping]);

  const send = () => { if (!input.trim() && attachedImages.length === 0) return; const ref = attachedImages.length > 0 ? { url: attachedImages[0].url, name: attachedImages[0].name } : null; sendMessage(input.replace(/@\S*/g, "").trim() || (attachedImages.length > 0 ? "Apply style transfer" : ""), ref, attachedImages.length > 1 ? attachedImages : undefined); setInput(""); setAttachedImages([]); setShowPicker(false); };
  const handleInputChange = (e) => { const v = e.target.value; setInput(v); const m = v.match(/@(\S*)$/); if (m) { setShowPicker(true); setPickerQuery(m[1]); } else { setShowPicker(false); setPickerQuery(""); } };
  const handleAssetSelect = (img) => { setAttachedImages((p) => [...p, { url: img.url, name: img.name }]); setShowPicker(false); setInput((p) => p.replace(/@\S*$/, "").trim()); setTimeout(() => inputRef.current?.focus(), 50); };

  const isEmpty = snap.messages.length === 0, hasPipeline = snap.nodes.length > 0, hasDoneNodes = snap.nodes.some((n) => n.data?.status === "done");

  return (
    <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--surface-1)", borderLeft: "2px solid var(--border)" }}>
      {/* Header */}
      <div style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "2px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: snap.running ? statusRunning : statusDone }} />
          <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>Agent</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {snap.messages.length > 0 && <button onClick={() => { clearChat(); setAttachedImages([]); }} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", background: "transparent", border: "none", color: "var(--text-dim)", fontFamily: "inherit" }}>Clear</button>}
          <Toggle on={toggleOn} onToggle={onToggle} disabled={snap.running} />
        </div>
      </div>

      {/* Quick actions */}
      {hasPipeline && !snap.running && hasDoneNodes && (
        <div style={{ padding: "8px 12px", borderBottom: "1.5px solid var(--border)", display: "flex", gap: 6 }}>
          <button onClick={reRunPipeline} style={qBtn(statusRunning)}>Re-run</button>
          <button onClick={() => { setInput("modify "); inputRef.current?.focus(); }} style={qBtn("#6366f1")}>Modify</button>
          <button onClick={() => { clearChat(); }} style={qBtn(statusDone)}>New</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, paddingBottom: 12 }}>
        {isEmpty && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "0 16px" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Describe what to generate</p>
              <p style={{ color: "var(--text-dim)", fontSize: 12 }}>Type <span style={{ color: "var(--accent)", fontWeight: 600 }}>@</span> to attach images</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { text: "Generate a cyberpunk city at night", action: () => sendMessage("Generate an image of a cyberpunk city at night") },
                { text: "Video of ocean waves at sunset", action: () => sendMessage("Create a video of ocean waves at sunset") },
                { text: "Merge two video clips together", action: () => sendMessage("Merge videos: combine two clips into one") },
              ].map((s) => (
                <button key={s.text} onClick={s.action} style={{
                  padding: "9px 12px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                  background: "var(--surface-0)", border: "2px solid var(--surface-3)",
                  color: "var(--text-muted)", fontSize: 13, fontFamily: "inherit", transition: "all 0.15s",
                  boxShadow: "var(--neu-shadow-sm)",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >{s.text}</button>
              ))}
            </div>
          </div>
        )}

        {snap.messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage msg={msg} />
            {msg.refImage && (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 14px 0" }}>
                <div style={{ borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--surface-3)", width: 78 }}>
                  <img src={msg.refImage.url} alt="" style={{ width: "100%", height: 48, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "3px 5px", fontSize: 10, color: "var(--text-dim)", textAlign: "center" }}>{msg.refImage.name}</div>
                </div>
              </div>
            )}
          </div>
        ))}

        {snap.questionnaire && (
          <div style={{ padding: "4px 14px" }}>
            <div style={{ border: "2px solid var(--surface-3)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--surface-0)" }}>
              {snap.questionnaire.questions.map((q, qi) => (
                <div key={qi}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: q.answer ? statusDone : "var(--surface-2)", border: q.answer ? "none" : "2px solid var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--text)" }}>{q.answer ? "\u2713" : qi + 1}</div>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, lineHeight: 1.4 }}>{q.q}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 30 }}>
                    {q.options.map((opt) => (
                      <button key={opt} onClick={() => answerQuestion(qi, opt)} style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 400, border: `2px solid ${q.answer === opt ? "var(--accent)" : "var(--surface-3)"}`, background: q.answer === opt ? "var(--surface-2)" : "var(--surface-0)", color: q.answer === opt ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>{opt}</button>
                    ))}
                  </div>
                  <div style={{ paddingLeft: 30, marginTop: 5 }}>
                    <input type="text" placeholder="Or type your own..." onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { answerQuestion(qi, e.target.value.trim()); e.target.value = ""; } }}
                      style={{ width: "100%", padding: "5px 9px", borderRadius: 6, fontSize: 12, background: "var(--surface-0)", border: "1.5px solid var(--surface-3)", color: "var(--text)", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, paddingLeft: 30 }}>
                <button onClick={submitQuestionnaire} disabled={snap.questionnaire.questions.some((q) => !q.answer)} style={{ padding: "7px 18px", borderRadius: 8, border: "2px solid var(--border)", cursor: "pointer", background: snap.questionnaire.questions.every((q) => q.answer) ? "var(--accent)" : "var(--surface-0)", color: snap.questionnaire.questions.every((q) => q.answer) ? "var(--accent-text)" : "var(--text-dim)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", opacity: snap.questionnaire.questions.every((q) => q.answer) ? 1 : 0.3, boxShadow: snap.questionnaire.questions.every((q) => q.answer) ? "var(--neu-shadow-sm)" : "none" }}>Send</button>
                <button onClick={skipQuestionnaire} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-dim)", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>Skip</button>
              </div>
            </div>
          </div>
        )}

        {snap.isAgentTyping && (
          <div style={{ display: "flex", padding: "0 14px", gap: 6, alignItems: "center" }}>
            {[0,1,2].map((i) => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: `p-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "10px 12px", borderTop: "2px solid var(--border)", position: "relative" }}>
        {showPicker && <AssetPicker query={pickerQuery} onSelect={handleAssetSelect} onClose={() => setShowPicker(false)} />}

        {attachedImages.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {attachedImages.map((img, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px 3px 3px", borderRadius: 8, background: "var(--surface-0)", border: "1.5px solid var(--surface-3)" }}>
                <img src={img.url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name.length > 14 ? img.name.slice(0, 12) + "..." : img.name}</span>
                <button onClick={() => setAttachedImages((p) => p.filter((_, j) => j !== i))} style={{ width: 14, height: 14, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-dim)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", background: "var(--surface-0)", borderRadius: 12, border: "1.5px solid var(--surface-3)", padding: "3px 3px 3px 12px" }}>
          <input ref={inputRef} value={input} onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !showPicker) { e.preventDefault(); send(); } if (e.key === "Escape" && showPicker) setShowPicker(false); }}
            placeholder={snap.running ? "Running..." : attachedImages.length > 0 ? "Describe what to do..." : "@ to attach, then describe..."}
            disabled={snap.running || snap.isAgentTyping}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit", padding: "7px 0" }}
          />
          <button onClick={send} disabled={(!input.trim() && attachedImages.length === 0) || snap.running} style={{
            width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", flexShrink: 0,
            background: (input.trim() || attachedImages.length > 0) ? "var(--accent)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: (input.trim() || attachedImages.length > 0) ? 1 : 0.2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
          </button>
        </div>
      </div>

      <style>{`@keyframes p-dot { 0%,80%,100%{opacity:.15;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

function qBtn(color) { return { flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", background: "transparent", color, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }; }
