import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { appStore, navigate } from "../../stores/appStore";
import {
  movieStore, fetchProject, pollProjectStatus, cancelStoryboardProject, retryStoryboardProject,
  generateSceneVoiceover, generateSceneMusic, assembleScene,
} from "../../stores/movieStore";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../utils/cn";
import { MetaTag } from "./ShotsExportTabs";
import { OverviewTab, CharactersTab, LocationsTab } from "./EntityTabs";
import { ShotsTab, ExportTab } from "./ShotsExportTabs";
import { StoryboardWalkthrough } from "./StoryboardWalkthrough";

const TABS = ["overview", "scenes", "characters", "locations", "shots", "export"];

export function ProjectView() {
  const { params } = useSnapshot(appStore);
  const { activeProject, activeProjectLoading } = useSnapshot(movieStore);
  const [tab, setTab] = useState("overview");
  const [showWalkthrough, setShowWalkthrough] = useState(() => !localStorage.getItem("g5-walkthrough-dismissed"));
  const [progress, setProgress] = useState(null);

  const projectId = params.projectId;

  useEffect(() => {
    if (projectId) fetchProject(projectId);
  }, [projectId]);

  // Auto-poll if processing
  useEffect(() => {
    if (!activeProject || activeProject.status !== "processing") return;
    let cancelled = false;
    (async () => {
      try {
        await pollProjectStatus(projectId, (status) => {
          if (!cancelled) setProgress(status.progress);
        });
        if (!cancelled) fetchProject(projectId);
      } catch {
        if (!cancelled) fetchProject(projectId);
      } finally {
        if (!cancelled) setProgress(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProject?.status, projectId]);

  if (!activeProject || activeProject.project_id !== projectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin text-[var(--text-muted)]">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const proj = activeProject;
  const isProcessing = proj.status === "processing";
  const isError = proj.status === "error" || proj.status === "cancelled";

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 sm:p-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: "2px solid var(--border)" }}>
          <button onClick={() => navigate("/storyboard")} className="p-2 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--text)] truncate">{proj.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              {proj.genre && <Badge variant="info">{proj.genre}</Badge>}
              <Badge variant={proj.status === "ready" ? "success" : proj.status === "processing" ? "warning" : "error"}>{proj.status}</Badge>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>{proj.total_scenes} scenes · {proj.total_characters} characters</span>
            </div>
          </div>
          {isProcessing && (
            <Button variant="danger" size="sm" onClick={() => cancelStoryboardProject(projectId).then(() => fetchProject(projectId))}>Cancel</Button>
          )}
          {isError && (
            <Button size="sm" onClick={() => retryStoryboardProject(projectId).then(() => fetchProject(projectId))}>Retry</Button>
          )}
        </div>

        {/* Progress */}
        {isProcessing && progress && (
          <div style={{ padding: 20, borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", marginBottom: 24, boxShadow: "var(--neu-shadow)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--text)]">{progress.phase_label || "Processing..."}</span>
              <span className="text-sm font-mono" style={{ color: "var(--accent)" }}>{progress.percent_complete}%</span>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress.percent_complete}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-tertiary))", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div className="flex items-center gap-4 mt-3">
              {progress.scenes_total > 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Scenes: {progress.scenes_processed}/{progress.scenes_total}</span>}
              {progress.cost_usd > 0 && <span className="text-xs" style={{ color: "var(--text-dim)" }}>${progress.cost_usd.toFixed(4)}</span>}
              {progress.elapsed_seconds > 0 && <span className="text-xs" style={{ color: "var(--text-dim)" }}>{Math.round(progress.elapsed_seconds)}s</span>}
            </div>
          </div>
        )}

        {/* Error */}
        {isError && proj.error_message && (
          <div style={{ padding: 16, borderRadius: 10, backgroundColor: "rgba(255,107,107,0.1)", border: "2px solid rgba(255,107,107,0.3)", marginBottom: 24 }}>
            <p className="text-sm text-red-400">{proj.error_message}</p>
          </div>
        )}

        {/* Tabs */}
        {proj.status === "ready" && (
          <>
            <div className="flex gap-1 mb-6" style={{ padding: 4, borderRadius: 10, backgroundColor: "var(--surface-0)", border: "2px solid var(--border)" }}>
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer"
                  style={{ backgroundColor: tab === t ? "var(--surface-2)" : "transparent", color: tab === t ? "var(--text)" : "var(--text-muted)", border: tab === t ? "2px solid var(--accent)" : "2px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>

            {showWalkthrough && tab === "overview" && (
              <StoryboardWalkthrough
                onNavigate={(t) => { setTab(t); }}
                onDismiss={() => { setShowWalkthrough(false); localStorage.setItem("g5-walkthrough-dismissed", "1"); }}
              />
            )}

            {tab === "overview" && <OverviewTab project={proj} />}
            {tab === "scenes" && <ScenesProductionTab project={proj} projectId={projectId} />}
            {tab === "characters" && <CharactersTab project={proj} projectId={projectId} />}
            {tab === "locations" && <LocationsTab project={proj} projectId={projectId} />}
            {tab === "shots" && <ShotsTab project={proj} projectId={projectId} />}
            {tab === "export" && <ExportTab project={proj} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Scenes Production Tab (Image → Video → Dialogue → BGM → Merge) ─── */

function ScenesProductionTab({ project, projectId }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-2">
      {(project.scenes || []).map((scene) => (
        <div key={scene.scene_number} style={{ borderRadius: 10, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)", overflow: "hidden" }}>
          <button
            className="w-full flex items-center gap-4 px-4 py-3 text-left cursor-pointer transition-colors"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            onClick={() => setExpanded(expanded === scene.scene_number ? null : scene.scene_number)}
          >
            <span className="text-xs font-mono px-2 py-0.5 rounded min-w-10 text-center" style={{ color: "var(--text-dim)", backgroundColor: "var(--surface-0)", border: "2px solid var(--surface-3)" }}>
              {scene.scene_number}
            </span>
            <span className="text-sm text-[var(--text)] font-medium flex-1 truncate">{scene.scene_heading}</span>
            <Badge variant="default">{scene.scene_type}</Badge>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{scene.shots?.length || 0} shots</span>
            <svg className={cn("w-4 h-4 transition-transform", expanded === scene.scene_number && "rotate-180")} style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded === scene.scene_number && (
            <SceneProduction scene={scene} project={project} projectId={projectId} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Per-Scene Production Panel ─── */

function SceneProduction({ scene, project, projectId }) {
  const [busy, setBusy] = useState(null);
  const [genError, setGenError] = useState("");

  const sectionStyle = { padding: 16, borderRadius: 8, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)" };

  const wrap = (key, fn) => async () => {
    setBusy(key);
    setGenError("");
    try { await fn(); } catch (err) { setGenError(err.message || "Failed"); }
    finally { setBusy(null); }
  };

  const shotsWithVideo = (scene.shots || []).filter((s) => s.video_url).length;
  const totalShots = scene.shots?.length || 0;
  const hasSceneVideo = !!scene.scene_video_url;
  const hasVoiceover = !!scene.voiceover_url;
  const hasMusic = !!scene.music_url;
  const hasAssembled = !!scene.assembled_url;

  // Detect invalid URLs (blob: URLs don't survive page refresh)
  const isValidUrl = (url) => url && (url.startsWith("http://") || url.startsWith("https://"));
  const voiceoverValid = isValidUrl(scene.voiceover_url);
  const musicValid = isValidUrl(scene.music_url);

  return (
    <div style={{ padding: "16px 16px 20px", borderTop: "2px solid var(--border)" }}>
      {/* Scene info */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant="info">{scene.time_of_day}</Badge>
        <Badge variant="default">{scene.mood}</Badge>
        {(scene.character_ids || []).map((cid) => {
          const c = (project.characters || []).find((ch) => ch.id === cid);
          return c ? <Badge key={cid} variant="default">{c.name}</Badge> : null;
        })}
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{scene.synopsis}</p>

      {/* Dialogue preview */}
      {scene.dialogue?.length > 0 && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-0)", border: "2px solid var(--surface-3)" }}>
          <span className="text-[10px] uppercase font-medium" style={{ color: "var(--text-dim)" }}>Dialogue</span>
          <div className="mt-2 space-y-1">
            {scene.dialogue.slice(0, 5).map((d, i) => (
              <p key={i} className="text-xs"><span style={{ color: "var(--accent-tertiary)", fontWeight: 600 }}>{d.character_name}: </span><span style={{ color: "var(--text)" }}>{d.text}</span></p>
            ))}
            {scene.dialogue.length > 5 && <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>+{scene.dialogue.length - 5} more lines</p>}
          </div>
        </div>
      )}

      {/* Pipeline Status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Shot Videos", done: shotsWithVideo === totalShots && totalShots > 0, text: `${shotsWithVideo}/${totalShots}` },
          { label: "Scene Clip", done: hasSceneVideo },
          { label: "Voiceover", done: voiceoverValid },
          { label: "Music", done: musicValid },
          { label: "Assembled", done: hasAssembled },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, border: `2px solid ${s.done ? "var(--accent)" : "var(--surface-3)"}`, backgroundColor: s.done ? "rgba(var(--accent-rgb, 0,0,0), 0.05)" : "var(--surface-0)" }}>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{s.done ? "✓" : "○"}</div>
            <div className="text-[9px] font-medium" style={{ color: s.done ? "var(--accent)" : "var(--text-dim)" }}>{s.label}</div>
            {s.text && <div className="text-[9px]" style={{ color: "var(--text-dim)" }}>{s.text}</div>}
          </div>
        ))}
      </div>

      {/* Assembled or scene video preview */}
      {(hasAssembled || hasSceneVideo) && (
        <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", border: "3px solid var(--border)" }}>
          <video src={scene.assembled_url || scene.scene_video_url} controls style={{ width: "100%", maxHeight: 350, backgroundColor: "#000", display: "block" }} />
          <div style={{ padding: 8, backgroundColor: "var(--surface-1)", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{hasAssembled ? "Final scene (video + audio)" : "Scene video clip"}</span>
          </div>
        </div>
      )}

      {/* Production Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Voiceover */}
        <div style={sectionStyle}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>AI Voiceover</span>
            <Button size="sm" disabled={!!busy} onClick={wrap("voice", () => generateSceneVoiceover(projectId, scene.scene_number))}>
              {busy === "voice" ? "Generating..." : voiceoverValid ? "Regenerate" : "Generate"}
            </Button>
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
            {scene.dialogue?.length || 0} dialogue lines will be synthesized via AI TTS.
          </p>
          {voiceoverValid && <audio src={scene.voiceover_url} controls style={{ width: "100%", height: 32 }} />}
          {hasVoiceover && !voiceoverValid && <p className="text-[10px]" style={{ color: "var(--status-error, #ef4444)" }}>Audio URL expired. Click Regenerate.</p>}
        </div>

        {/* Music */}
        <div style={sectionStyle}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Background Music</span>
            <Button size="sm" disabled={!!busy} onClick={wrap("music", () => generateSceneMusic(projectId, scene.scene_number))}>
              {busy === "music" ? "Generating..." : musicValid ? "Regenerate" : "Generate"}
            </Button>
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
            {scene.mood || "Cinematic"} · {scene.music_notes || "film score"}
          </p>
          {musicValid && <audio src={scene.music_url} controls style={{ width: "100%", height: 32 }} />}
          {hasMusic && !musicValid && <p className="text-[10px]" style={{ color: "var(--status-error, #ef4444)" }}>Audio URL expired. Click Regenerate.</p>}
        </div>
      </div>

      {/* Assemble Scene */}
      <div className="mt-3" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>Assemble Scene</span>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              Merge scene video + voiceover + music into final scene clip.
            </p>
          </div>
          <Button disabled={!!busy || !hasSceneVideo} onClick={wrap("assemble", () => assembleScene(projectId, scene.scene_number))}>
            {busy === "assemble" ? "Assembling..." : hasAssembled ? "Re-assemble" : "Assemble"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {genError && <p className="text-xs mt-3" style={{ color: "var(--status-error, #ef4444)" }}>{genError}</p>}

      {/* Loading */}
      {busy && (
        <div style={{ marginTop: 12, padding: 16, borderRadius: 8, backgroundColor: "var(--surface-1)", border: "3px solid var(--border)", textAlign: "center", boxShadow: "var(--neu-shadow)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin text-[var(--text)]" style={{ margin: "0 auto 8px" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Processing... This may take a few minutes.</p>
        </div>
      )}

      {/* Shot breakdown (collapsed) */}
      {scene.shots?.length > 0 && (
        <ShotBreakdown shots={scene.shots} />
      )}
    </div>
  );
}

/* ─── Shot Breakdown (collapsible) ─── */

function ShotBreakdown({ shots }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <svg className={cn("w-3 h-3 transition-transform", open && "rotate-90")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
        {shots.length} AI Shot Suggestions
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 10 }}>
          {shots.map((shot) => (
            <div key={shot.shot_number} style={{ border: "2px solid var(--surface-3)", borderRadius: 8, padding: "10px 12px" }}>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent)" }}>Shot {shot.shot_number}</span>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                <MetaTag label={shot.shot_size} /><MetaTag label={shot.camera_angle} /><MetaTag label={shot.camera_movement} /><MetaTag label={shot.lighting} />
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{shot.description}</p>
              {shot.rationale && <p className="text-[10px] italic mt-1" style={{ color: "var(--text-dim)" }}>{shot.rationale}</p>}
              {shot.duration_seconds && <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>{shot.duration_seconds}s</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
