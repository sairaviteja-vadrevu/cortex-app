import { useSnapshot } from "valtio";
import { appStore, navigate } from "../../stores/appStore";
import { authStore } from "../../stores/authStore";
import { worldStore } from "../../stores/worldStore";
import { movieStore } from "../../stores/movieStore";
import { Button } from "../ui/Button";
import { SettingsButton } from "../ui/SettingsPanel";
import { greeting } from "../dashboard/DashboardWidgets";

const sectionMeta = {
  dashboard: { title: null },
  storyboard: { title: "Storyboard Projects", desc: "Upload scripts, extract scenes with AI, generate shot breakdowns and visual storyboards." },
  studio: { title: "Image Studio", desc: "Generate images, videos, and virtual try-ons with AI." },
  characters: { title: "Character Library", desc: "Manage characters across your movies and worlds." },
  files: { title: "Files", desc: "Manage your uploaded assets." },
  pipeline: { title: "Agentic Pipeline", desc: "Automate your creative workflows." },
  training: { title: "LoRA Training", desc: "Train custom LoRA models with your images." },
  worlds: { title: "Worlds", desc: "Build and explore your 3D worlds." },
};

export function PageHeader() {
  const snap = useSnapshot(appStore);
  const authSnap = useSnapshot(authStore);
  const worldSnap = useSnapshot(worldStore);
  const sbSnap = useSnapshot(movieStore);

  const section = snap.section;
  const meta = sectionMeta[section];

  // Don't render for sections without meta (editor, storyboard-project, etc.)
  if (!meta) return null;

  const user = authSnap.user;
  const isDashboard = section === "dashboard";
  const totalProjects = sbSnap.projects.length;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="shrink-0" style={{ padding: "28px 16px 0", borderBottom: "2px solid var(--border)" }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p
            style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", marginBottom: 6 }}
          >
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ fontSize: isDashboard ? 36 : 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            {isDashboard ? greeting() : meta.title}
          </h1>
          {isDashboard ? (
            <p style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 600, marginTop: 8 }}>
              {worldSnap.worlds.length + totalProjects === 0
                ? "Start by creating your first world or storyboard project."
                : `You have ${worldSnap.worlds.length} worlds and ${totalProjects} storyboard projects.`}
            </p>
          ) : (
            meta.desc && <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500, marginTop: 6 }}>{meta.desc}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isDashboard && (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate("/worlds")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New World
              </Button>
              <Button size="sm" onClick={() => navigate("/storyboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Project
              </Button>
            </>
          )}
          <SettingsButton />

          {/* User info */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginLeft: 6,
                padding: "6px 12px",
                borderRadius: 10,
                border: "2px solid var(--border)",
                background: "var(--surface-1)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--accent-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block" style={{ minWidth: 0 }}>
                <p
                  style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {user.name || "User"}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
