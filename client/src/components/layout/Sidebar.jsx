import { useSnapshot } from "valtio";
import { appStore, navigate } from "../../stores/appStore";
import { authStore, signout } from "../../stores/authStore";

const navItems = [
  { label: "Dashboard", path: "/dashboard", section: "dashboard", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { label: "Worlds", path: "/worlds", section: "worlds", comingSoon: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.5 9h17M3.5 15h17"/></svg> },
  { label: "Storyboard", path: "/storyboard", section: "storyboard", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { label: "Studio", path: "/studio", section: "studio", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg> },
  { label: "Characters", path: "/characters", section: "characters", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { label: "Pipeline", path: "/pipeline", section: "pipeline", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6.5 7.5L10.5 10.5M17.5 7.5L13.5 10.5M12 14v4"/></svg> },
  { label: "Training", path: "/training", section: "training", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.102c3.898 1.1 7.868 1.7 11.929 1.7s8.03-.6 11.929-1.7a23.54 23.54 0 0 0-2.688-6.102M12 2.25c-2.148 0-4.268.213-6.33.625a48.69 48.69 0 0 0-.672 2.832c2.258-.405 4.573-.625 6.942-.625s4.684.22 6.942.625a48.69 48.69 0 0 0-.672-2.832A49.39 49.39 0 0 0 12 2.25Z"/></svg> },
  { label: "Files", path: "/files", section: "files", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg> },
];

export function Sidebar() {
  const snap = useSnapshot(appStore);
  const collapsed = snap.sidebarCollapsed;

  return (
    <div
      className={`${collapsed ? "w-16" : "w-52"} h-full flex flex-col transition-all duration-200 shrink-0`}
      style={{ background: "var(--sidebar-bg)", borderRight: "3px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center shrink-0" style={{ height: 52, padding: "0 14px" }}>
        {collapsed ? (
          <img src="https://cdn.prod.website-files.com/6788bb7d17ed7e14d9d3caed/6788efffc7e76937b35586d5_g5.png" alt="G5" className="h-6 w-6 object-contain" />
        ) : (
          <img src="https://cdn.prod.website-files.com/6788bb7d17ed7e14d9d3caed/6788c3b6b6fe202c94723dec_Galleri5.avif" alt="Galleri5" className="h-6 w-auto" style={{ filter: "var(--logo-filter)" }} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col" style={{ gap: 2, padding: "10px 8px" }}>
        {navItems.map((item) => {
          const active = (snap.section === item.section || (item.section === "storyboard" && snap.section === "storyboard-project")) && !item.comingSoon;
          const disabled = item.comingSoon;
          return (
            <button
              key={item.path}
              onClick={() => { if (!disabled) navigate(item.path); }}
              className="flex items-center transition-all duration-150 relative"
              style={{
                gap: 12,
                borderRadius: 10,
                padding: collapsed ? "10px 12px" : "10px 14px",
                border: active ? "2px solid var(--border)" : "2px solid transparent",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "var(--accent)" : "transparent",
                color: disabled ? "var(--text-dim)" : active ? "var(--accent-text)" : "var(--text-dim)",
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                boxShadow: active ? "var(--neu-shadow-sm)" : "none",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
              title={collapsed ? item.label : disabled ? "Coming Soon" : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="truncate flex items-center gap-2">
                  {item.label}
                  {disabled && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>SOON</span>}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 flex flex-col" style={{ padding: "10px 8px", gap: 4 }}>
        {/* Sign out */}
        <button
          onClick={() => { signout(); navigate("/"); }}
          className="flex items-center transition-colors cursor-pointer"
          style={{ borderRadius: 10, padding: collapsed ? 8 : "8px 14px", border: "none", background: "transparent", color: "var(--text-dim)", gap: 10, justifyContent: collapsed ? "center" : "flex-start", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}
          title="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>
        {/* Collapse */}
        <button
          onClick={() => { appStore.sidebarCollapsed = !appStore.sidebarCollapsed; }}
          className="flex items-center justify-center w-full transition-colors cursor-pointer"
          style={{ borderRadius: 10, padding: 8, border: "none", background: "transparent", color: "var(--text-dim)" }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Mobile Bottom Navigation ── */

const mobileItems = [
  { label: "Home", path: "/dashboard", section: "dashboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { label: "Storyboard", path: "/storyboard", section: "storyboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { label: "Studio", path: "/studio", section: "studio", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg> },
  { label: "Characters", path: "/characters", section: "characters", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg> },
  { label: "Files", path: "/files", section: "files", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg> },
];

export function MobileNav() {
  const snap = useSnapshot(appStore);

  return (
    <nav
      className="mobile-nav shrink-0"
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--sidebar-bg)",
        borderTop: "2px solid var(--border)",
        padding: "6px 8px env(safe-area-inset-bottom, 6px)",
        gap: 2,
        justifyContent: "space-around",
      }}
    >
      {mobileItems.map((item) => {
        const active = snap.section === item.section || (item.section === "storyboard" && snap.section === "storyboard-project");
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 cursor-pointer"
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 8,
              border: "none",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-text)" : "var(--text-dim)",
            }}
          >
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
