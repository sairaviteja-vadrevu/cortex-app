export function Select({ value, options, onChange, label }) {
  return (
    <div style={{ flex: 1 }}>
      {label && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 10, fontSize: 13, fontFamily: "inherit",
          background: "var(--surface-0)", border: "1.5px solid var(--surface-3)", color: "var(--text)",
          outline: "none", cursor: "pointer", appearance: "auto",
        }}
      >
        {options.map((o) => <option key={o.id + o.label} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}
