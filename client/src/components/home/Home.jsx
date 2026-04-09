import { pagePadding } from "../../utils/theme";

export function Home() {
  return (
    <div className="flex-1 overflow-auto">
      <div style={{ ...pagePadding, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center" }}>
        {/* Coming Soon */}
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--surface-1)", border: "3px solid var(--border)", boxShadow: "var(--neu-shadow)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.5 9h17M3.5 15h17"/></svg>
        </div>
        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-2)", padding: "4px 14px", borderRadius: 6, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, border: "2px solid var(--surface-3)" }}>Coming Soon</span>
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight" style={{ marginBottom: 8 }}>
          Worlds
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 420, lineHeight: 1.6, marginBottom: 24 }}>
          Create immersive 3D worlds with animations and AI-powered assets. Build environments, place objects, and bring your scenes to life.
        </p>
        <div style={{ padding: "14px 28px", borderRadius: 12, border: "3px solid var(--border)", background: "var(--surface-1)", boxShadow: "var(--neu-shadow)", color: "var(--text-dim)", fontSize: 13, fontWeight: 600 }}>
          We're building something amazing. Stay tuned.
        </div>
      </div>
    </div>
  );
}
