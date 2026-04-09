// Shared style objects — matte grey neubrutalism theme
// Uses CSS variables so themes apply globally

export const cardStyle = {
  background: "var(--surface-1)",
  border: "3px solid var(--border)",
  borderRadius: 12,
  boxShadow: "var(--neu-shadow)",
};

export const cardHoverStyle = {
  ...cardStyle,
  boxShadow: "var(--neu-shadow-sm)",
};

export const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "2px solid var(--surface-3)",
  backgroundColor: "var(--surface-0)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

export const panelStyle = {
  background: "var(--surface-1)",
  border: "3px solid var(--border)",
  borderRadius: 12,
  boxShadow: "var(--neu-shadow)",
};

export const sidebarBg = "var(--sidebar-bg)";

export const heroBg =
  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108,99,255,0.12), transparent)";

export const glowSpot = (color = "rgba(108,99,255,0.08)", size = 600) => ({
  position: "absolute",
  width: size,
  height: size,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${color}, transparent 70%)`,
  pointerEvents: "none",
  filter: "blur(40px)",
});

export const pagePadding = { padding: 32 };

export const sectionGap = { marginBottom: 40 };

export const gridCols = (min = 250) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: 14,
});

export const fixedGrid = (cols = 4) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: 14,
});

// Neubrutalism utility
export const neuBorder = "3px solid var(--border)";
export const neuShadow = "var(--neu-shadow)";
export const neuShadowSm = "var(--neu-shadow-sm)";
export const neuShadowHover = "var(--neu-shadow-hover)";

// Semantic status colors — matte-compatible
export const statusRunning = "#ca8a04";
export const statusDone = "#22c55e";
export const statusError = "#FF6B6B";
export const statusWarning = "#eab308";

// Status rgba helpers (for borders, glows, backgrounds)
export const statusRunningBg = "rgba(202,138,4,0.08)";
export const statusRunningBorder = "rgba(202,138,4,0.5)";
export const statusDoneBg = "rgba(34,197,94,0.15)";
export const statusDoneBorder = "rgba(34,197,94,0.4)";
export const statusErrorBg = "rgba(255,107,107,0.15)";
export const statusErrorBorder = "rgba(255,107,107,0.4)";
