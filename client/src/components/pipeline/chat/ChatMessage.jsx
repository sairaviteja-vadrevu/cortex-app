import { statusRunning, statusError } from "../../../utils/theme";

export function ChatMessage({ msg }) {
  if (msg.role === "user") return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 14px" }}>
      <div style={{ maxWidth: "85%", padding: "9px 14px", borderRadius: "14px 14px 4px 14px", background: "var(--surface-2)", border: "2px solid var(--surface-3)", color: "var(--text)", fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
    </div>
  );
  if (msg.role === "system") return (
    <div style={{ display: "flex", padding: "0 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        {msg.nodeEvent && <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 7, background: msg.text.includes("Error") ? statusError : statusRunning, flexShrink: 0 }} />}
        <span style={{ color: msg.text.includes("Error") ? statusError : "var(--text-muted)", fontSize: 12 }}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:var(--accent)'>$1</strong>") }} />
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", padding: "0 14px", gap: 8, alignItems: "flex-start" }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 2, background: "var(--surface-1)", border: "1.5px solid var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4zM4 20v-1a8 8 0 0116 0v1"/></svg>
      </div>
      <div style={{ padding: "8px 14px", borderRadius: "4px 14px 14px 14px", background: "var(--surface-0)", border: "1.5px solid var(--surface-3)" }}>
        {msg.thinking && <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: statusRunning, marginBottom: 4 }}>Thinking</div>}
        <span style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:var(--accent)'>$1</strong>").replace(/\n/g, "<br/>") }} />
      </div>
    </div>
  );
}
