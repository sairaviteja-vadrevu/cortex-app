import { navigate } from "../../stores/appStore";
import { cardStyle } from "../../utils/theme";

/* ─── Helpers ─── */

export function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const statusVariant = {
  draft: "default",
  "in-progress": "warning",
  review: "info",
  complete: "success",
  todo: "default",
  done: "success",
};

/* ─── Quick Action Cards ─── */

export const quickActions = [
  {
    title: "New World",
    description: "Create an immersive 3D environment",
    path: "/worlds",
    accentColor: "#818cf8",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3.5 9h17M3.5 15h17" />
      </svg>
    ),
  },
  {
    title: "New Project",
    description: "Create a storyboard project",
    path: "/storyboard",
    accentColor: "#f472b6",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Generate Image",
    description: "AI-powered image creation",
    path: "/studio",
    accentColor: "#22d3ee",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      </svg>
    ),
  },
  {
    title: "Characters",
    description: "Build your character library",
    path: "/characters",
    accentColor: "#fbbf24",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

/* ─── Stat Card ─── */

export function StatCard({ label, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface-1)",
        backdropFilter: "blur(8px)",
        border: "3px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--neu-shadow)",
        padding: "24px 22px",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "var(--text)", letterSpacing: "-0.02em" }}>
            {value}
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", marginTop: 10 }}>
            {label}
          </p>
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─── Activity Item ─── */

export function ActivityItem({ icon, iconColor, title, subtitle, time }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${iconColor}20`, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{subtitle}</p>
      </div>
      <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, flexShrink: 0 }}>{time}</span>
    </div>
  );
}

/* ─── Activity Feed Builder ─── */

export function buildActivityFeed(worldSnap, sbSnap, studioSnap, charSnap) {
  const items = [];

  worldSnap.worlds.forEach((w) => {
    items.push({
      type: "world", title: `World: ${w.name}`, subtitle: `${w.objects?.length || 0} objects`, time: w.createdAt, iconColor: "#818cf8",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>,
    });
  });

  (sbSnap.projects || []).forEach((p) => {
    items.push({
      type: "project", title: `Project: ${p.title}`, subtitle: `${p.total_scenes || 0} scenes · ${p.status}`, time: new Date(p.created_at).getTime(), iconColor: "#f472b6",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    });
  });

  studioSnap.generations.forEach((g) => {
    items.push({
      type: "generation", title: g.prompt?.slice(0, 50) || "Image generation", subtitle: g.status, time: g.createdAt, iconColor: "#22d3ee",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5" /></svg>,
    });
  });

  charSnap.characters.forEach((c) => {
    items.push({
      type: "character", title: `Character: ${c.name}`, subtitle: `Used ${c.usageCount || 0} times`, time: c.createdAt, iconColor: "#fbbf24",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4" /><path d="M16 21v-2a4 4 0 00-4-4H6" /></svg>,
    });
  });

  return items.sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 8);
}
