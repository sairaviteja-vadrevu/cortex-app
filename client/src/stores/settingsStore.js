import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "g5-settings";

const defaults = {
  font: "Space Grotesk",
  theme: "default",
};

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export const settingsStore = proxy({ ...load(), panelOpen: false });

subscribe(settingsStore, () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ font: settingsStore.font, theme: settingsStore.theme })
  );
});

export const fonts = [
  { name: "Space Grotesk", value: "Space Grotesk" },
  { name: "DM Sans", value: "DM Sans" },
  { name: "JetBrains Mono", value: "JetBrains Mono" },
  { name: "Poppins", value: "Poppins" },
  { name: "IBM Plex Sans", value: "IBM Plex Sans" },
];

export const themes = [
  {
    name: "Default",
    value: "default",
    colors: {
      "--surface-0": "#2B2D3F",
      "--surface-1": "#353849",
      "--surface-2": "#3E4155",
      "--surface-3": "#474B62",
      "--accent": "#FFD60A",
      "--accent-text": "#1A1C2B",
      "--accent-secondary": "#FF6B6B",
      "--accent-tertiary": "#6C63FF",
      "--border": "#1A1C2B",
      "--text": "#FFFFFF",
      "--text-muted": "#A0A3B8",
      "--text-dim": "#6B6F85",
      "--neu-shadow": "4px 4px 0px #1A1C2B",
      "--neu-shadow-sm": "2px 2px 0px #1A1C2B",
      "--neu-shadow-hover": "1px 1px 0px #1A1C2B",
      "--sidebar-bg": "#1A1C2B",
      "--logo-filter": "brightness(10)",
    },
  },
  {
    name: "White & Black",
    value: "white-black",
    colors: {
      "--surface-0": "#F2F2F2",
      "--surface-1": "#FFFFFF",
      "--surface-2": "#E8E8E8",
      "--surface-3": "#D0D0D0",
      "--accent": "#111111",
      "--accent-text": "#FFFFFF",
      "--accent-secondary": "#555555",
      "--accent-tertiary": "#888888",
      "--border": "#111111",
      "--text": "#111111",
      "--text-muted": "#555555",
      "--text-dim": "#888888",
      "--neu-shadow": "4px 4px 0px #111111",
      "--neu-shadow-sm": "2px 2px 0px #111111",
      "--neu-shadow-hover": "1px 1px 0px #111111",
      "--sidebar-bg": "#FFFFFF",
      "--logo-filter": "brightness(0)",
    },
  },
  {
    name: "Midnight Contrast",
    value: "midnight-contrast",
    colors: {
      "--surface-0": "#18181B",
      "--surface-1": "#27272A",
      "--surface-2": "#3F3F46",
      "--surface-3": "#52525B",
      "--accent": "#FBBF24",
      "--accent-text": "#18181B",
      "--accent-secondary": "#F87171",
      "--accent-tertiary": "#A78BFA",
      "--border": "#09090B",
      "--text": "#FAFAFA",
      "--text-muted": "#A1A1AA",
      "--text-dim": "#71717A",
      "--neu-shadow": "4px 4px 0px #09090B",
      "--neu-shadow-sm": "2px 2px 0px #09090B",
      "--neu-shadow-hover": "1px 1px 0px #09090B",
      "--sidebar-bg": "#09090B",
      "--logo-filter": "brightness(10)",
    },
  },
];

export function applySettings() {
  const root = document.documentElement;

  // Apply theme
  const theme = themes.find((t) => t.value === settingsStore.theme) || themes[0];
  for (const [key, val] of Object.entries(theme.colors)) {
    root.style.setProperty(key, val);
  }

  // Apply font
  document.body.style.fontFamily = `"${settingsStore.font}", sans-serif`;
}
