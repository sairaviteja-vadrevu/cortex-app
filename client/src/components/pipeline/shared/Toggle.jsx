export function Toggle({ on, onToggle, disabled }) {
  return (
    <button onClick={onToggle} disabled={disabled} style={{
      width: 38, height: 22, borderRadius: 11, border: "none", padding: 2,
      background: on ? "var(--accent)" : "var(--surface-3)",
      cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.25s",
      display: "flex", alignItems: "center", opacity: disabled ? 0.4 : 1,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: on ? "var(--accent-text)" : "var(--text-dim)",
        transform: on ? "translateX(16px)" : "translateX(0)",
        transition: "transform 0.25s, background 0.25s",
      }} />
    </button>
  );
}
