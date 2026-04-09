import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { navigate } from "../../stores/appStore";
import { worldStore } from "../../stores/worldStore";
import { movieStore, fetchProjects } from "../../stores/movieStore";
import { studioStore } from "../../stores/studioStore";
import { assetStore } from "../../stores/assetStore";
import { characterStore } from "../../stores/characterStore";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { timeAgo, greeting, quickActions, StatCard, ActivityItem, buildActivityFeed } from "./DashboardWidgets";

/* ── Shared ── */
const C = { background: "var(--surface-1)", backdropFilter: "blur(8px)", border: "3px solid var(--border)", borderRadius: 12, boxShadow: "var(--neu-shadow)" };
const T = { fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text)" };
const innerCard = { border: "2px solid var(--surface-3)", borderRadius: 10 };

const statusVariant = {
  ready: "success",
  processing: "warning",
  error: "error",
  cancelled: "default",
};

export function Dashboard() {
  const worldSnap = useSnapshot(worldStore);
  const sbSnap = useSnapshot(movieStore);
  const studioSnap = useSnapshot(studioStore);
  const assetSnap = useSnapshot(assetStore);
  const charSnap = useSnapshot(characterStore);

  useEffect(() => { fetchProjects(); }, []);

  const recentWorlds = [...worldSnap.worlds].reverse().slice(0, 6);
  const recentProjects = [...sbSnap.projects].slice(0, 6);
  const recentGenerations = [...studioSnap.generations].reverse().slice(0, 4);
  const recentActivity = buildActivityFeed(worldSnap, sbSnap, studioSnap, charSnap);

  const totalProjects = sbSnap.projects.length;
  const readyProjects = sbSnap.projects.filter((p) => p.status === "ready").length;
  const totalScenes = sbSnap.projects.reduce((sum, p) => sum + (p.total_scenes || 0), 0);


  return (
    <div className="flex-1 overflow-auto">
      <div style={{ padding: "28px 16px 80px" }}>

        {/* Header is now in PageHeader (via AppShell) */}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-9">
          <StatCard label="Worlds" value={worldSnap.worlds.length} color="#818cf8" onClick={() => navigate("/worlds")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /></svg>} />
          <StatCard label="Projects" value={totalProjects} color="#f472b6" onClick={() => navigate("/storyboard")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <StatCard label="Characters" value={charSnap.characters.length} color="#fbbf24" onClick={() => navigate("/characters")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="7" r="4" /><path d="M16 21v-2a4 4 0 00-4-4H6" /></svg>} />
          <StatCard label="Generations" value={studioSnap.generations.length} color="#22d3ee" onClick={() => navigate("/studio")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5" /></svg>} />
          <StatCard label="Assets" value={assetSnap.assets.length} color="var(--accent)" onClick={() => navigate("/files")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" /></svg>} />
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ ...T, marginBottom: 16 }}>Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((a) => (
              <div key={a.title} onClick={() => navigate(a.path)} style={{ ...C, padding: "24px 22px", cursor: "pointer" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${a.accentColor}20`, border: `2px solid ${a.accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", color: a.accentColor, marginBottom: 16 }}>
                  {a.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{a.title}</h3>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>{a.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

          {/* Recent Worlds */}
          <div style={{ ...C, padding: "24px", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={T}>Recent Worlds</h2>
              {recentWorlds.length > 0 && <button onClick={() => navigate("/worlds")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>View all</button>}
            </div>
            {recentWorlds.length === 0 ? (
              <div onClick={() => navigate("/worlds")} style={{ padding: "36px 0", textAlign: "center", cursor: "pointer" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1" style={{ margin: "0 auto 14px" }}><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3.5 9h17M3.5 15h17" /></svg>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No worlds yet</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginTop: 6 }}>Create your first 3D world to get started</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {recentWorlds.map((w) => (
                  <div key={w.id} onClick={() => navigate(`/world/${w.id}`)} style={{ ...innerCard, cursor: "pointer", overflow: "hidden" }}>
                    <div style={{ aspectRatio: "16/9", background: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {w.thumbnail ? <img src={w.thumbnail} alt={w.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1"><path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>{w.objects?.length || 0} objects</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>{timeAgo(w.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div style={{ ...C, padding: "24px", overflow: "auto" }}>
            <h2 style={{ ...T, marginBottom: 14 }}>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", padding: "20px 0" }}>No activity yet. Start creating to see your history here.</p>
            ) : (
              <div>
                {recentActivity.map((item, i) => (
                  <div key={i}>
                    <ActivityItem icon={item.icon} iconColor={item.iconColor} title={item.title} subtitle={item.subtitle} time={timeAgo(item.time)} />
                    {i < recentActivity.length - 1 && <div style={{ height: 1, background: "var(--surface-3)" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Storyboard Projects */}
          <div style={{ ...C, padding: "24px", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={T}>Recent Projects</h2>
              {recentProjects.length > 0 && <button onClick={() => navigate("/storyboard")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>View all</button>}
            </div>
            {recentProjects.length === 0 ? (
              <div onClick={() => navigate("/storyboard")} style={{ padding: "36px 0", textAlign: "center", cursor: "pointer" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1" style={{ margin: "0 auto 14px" }}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No projects yet</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginTop: 6 }}>Create your first storyboard project</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentProjects.map((proj) => (
                  <div key={proj.project_id} onClick={() => navigate(`/storyboard/${proj.project_id}`)} style={{ ...innerCard, padding: "16px 18px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(244,114,182,0.15)", border: "2px solid rgba(244,114,182,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.title}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{proj.total_scenes || 0} scenes</span>
                          {proj.genre && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{proj.genre}</span>}
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>{proj.llm_provider}</span>
                        </div>
                      </div>
                      <Badge variant={statusVariant[proj.status] || "default"}>{proj.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Production Overview + Storage */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {totalProjects > 0 && (
              <div style={{ ...C, padding: "24px" }}>
                <h2 style={{ ...T, marginBottom: 16 }}>Production Overview</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--surface-0)", border: "2px solid var(--surface-3)" }}>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>{totalScenes}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Total Scenes</p>
                  </div>
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--surface-0)", border: "2px solid var(--surface-3)" }}>
                    <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>{readyProjects}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Ready Projects</p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...C, padding: "24px", flex: 1 }}>
              <h2 style={{ ...T, marginBottom: 18 }}>Storage Breakdown</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Images", count: assetSnap.assets.filter((a) => a.type === "image").length + studioSnap.generations.length + sbSnap.projects.reduce((s, p) => s + (p.total_images || 0), 0), color: "#818cf8" },
                  { label: "Videos", count: assetSnap.assets.filter((a) => a.type === "video").length + sbSnap.projects.reduce((s, p) => s + (p.total_videos || 0), 0), color: "#f472b6" },
                  { label: "Audio", count: assetSnap.assets.filter((a) => a.type === "audio").length + sbSnap.projects.reduce((s, p) => s + (p.total_audio || 0), 0), color: "#22d3ee" },
                  { label: "3D Models", count: assetSnap.assets.filter((a) => a.type === "model").length, color: "#fbbf24" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>{item.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generations - full width */}
          {recentGenerations.length > 0 && (
            <div style={{ ...C, padding: "24px", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={T}>Recent Generations</h2>
                <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>View all</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {recentGenerations.map((gen) => (
                  <div key={gen.id} onClick={() => navigate("/studio")} style={{ ...innerCard, cursor: "pointer", overflow: "hidden" }}>
                    <div style={{ aspectRatio: "1", background: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {gen.imageUrl ? <img src={gen.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gen.prompt?.slice(0, 40) || "Untitled"}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginTop: 4 }}>{timeAgo(gen.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes p-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
