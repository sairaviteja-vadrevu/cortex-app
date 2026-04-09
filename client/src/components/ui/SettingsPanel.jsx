import { useSnapshot } from "valtio";
import {
  settingsStore,
  fonts,
  themes,
  applySettings,
} from "../../stores/settingsStore";

/* ── Small gear button to place next to greeting ── */
export function SettingsButton() {
  return (
    <button
      onClick={() => { settingsStore.panelOpen = !settingsStore.panelOpen; }}
      className="flex items-center justify-center cursor-pointer transition-colors duration-150"
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "2px solid var(--surface-3)",
        background: "transparent",
        color: "var(--text-muted)",
      }}
      title="Settings"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}

/* ── Right sidebar panel ── */
export function SettingsSidebar({ open, onClose }) {
  const snap = useSnapshot(settingsStore);

  const pickFont = (f) => {
    settingsStore.font = f;
    applySettings();
  };

  const pickTheme = (t) => {
    settingsStore.theme = t;
    applySettings();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col transition-transform duration-300"
        style={{
          width: 320,
          transform: open ? "translateX(0)" : "translateX(100%)",
          background: "var(--surface-0)",
          borderLeft: "3px solid var(--border)",
          boxShadow: open ? "-8px 0 24px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "20px 24px", borderBottom: "2px solid var(--surface-3)" }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--text-dim)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto" style={{ padding: 24 }}>

          {/* Fonts */}
          <div style={{ marginBottom: 28 }}>
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-dim)", marginBottom: 12, letterSpacing: "0.06em" }}
            >
              Font
            </div>
            <div className="flex flex-col" style={{ gap: 4 }}>
              {fonts.map((f) => {
                const active = snap.font === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => pickFont(f.value)}
                    className="flex items-center cursor-pointer transition-all duration-150"
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: active
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                      background: active
                        ? "var(--surface-1)"
                        : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 14,
                      fontFamily: `"${f.value}", sans-serif`,
                      fontWeight: active ? 600 : 400,
                      textAlign: "left",
                    }}
                  >
                    {f.name}
                    {active && (
                      <svg
                        className="ml-auto"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Themes */}
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-dim)", marginBottom: 12, letterSpacing: "0.06em" }}
            >
              Theme
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {themes.map((t) => {
                const active = snap.theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => pickTheme(t.value)}
                    className="flex items-center cursor-pointer transition-all duration-150"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: active
                        ? `3px solid ${t.colors["--accent"]}`
                        : "3px solid var(--surface-3)",
                      background: active
                        ? t.colors["--surface-1"]
                        : "var(--surface-1)",
                      boxShadow: active ? `3px 3px 0px ${t.colors["--border"]}` : "none",
                      gap: 12,
                    }}
                  >
                    {/* Color swatches */}
                    <div className="flex" style={{ gap: 4 }}>
                      {[
                        t.colors["--surface-0"],
                        t.colors["--accent"],
                        t.colors["--accent-secondary"],
                        t.colors["--accent-tertiary"],
                      ].map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 5,
                            background: c,
                            border: `2px solid ${t.colors["--border"]}`,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        color: active ? t.colors["--accent"] : "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </span>
                    {active && (
                      <svg
                        className="ml-auto"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={t.colors["--accent"]}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
