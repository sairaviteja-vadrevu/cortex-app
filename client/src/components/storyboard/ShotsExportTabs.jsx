import { useState } from "react";
import { Button } from "../ui/Button";
import {
  fetchProject, generateShotImage, generateShotVideo, generateAllShotImages, generateAllShotVideos,
  assembleSceneVideo, assembleFinalMovie,
} from "../../stores/movieStore";

/* ─── Shared ─── */

export function MetaTag({ label }) {
  if (!label) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--surface-0)", color: "var(--text-muted)", border: "1px solid var(--surface-3)" }}>
      {label}
    </span>
  );
}

export function StatusDot({ done, label }) {
  return (
    <div className="flex items-center gap-1">
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: done ? "#22c55e" : "var(--surface-3)" }} />
      <span className="text-[9px]" style={{ color: done ? "#22c55e" : "var(--text-dim)" }}>{label}</span>
    </div>
  );
}

/* ─── Export Tab (Assemble final movie) ─── */

export function ExportTab({ project }) {
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(null);
  const [mergeError, setMergeError] = useState("");

  const projectId = project.project_id;
  const scenes = project.scenes || [];
  const scenesWithVideo = scenes.filter((s) => s.assembled_url || s.scene_video_url);
  const hasFinal = !!project.final_video_url;

  const handleAssembleFinal = async () => {
    setMerging(true);
    setMergeError("");
    setMergeProgress({ completed: 0, total: scenesWithVideo.length - 1 });
    try {
      await assembleFinalMovie(projectId, (p) => setMergeProgress(p));
    } catch (err) {
      setMergeError(err.message || "Assembly failed");
    } finally {
      setMerging(false);
      setMergeProgress(null);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Scenes", value: project.total_scenes },
          { label: "Characters", value: project.total_characters },
          { label: "Locations", value: project.total_locations },
          { label: "Assets", value: project.total_assets },
        ].map((s) => (
          <div key={s.label} style={{ padding: 20, borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", textAlign: "center", boxShadow: "var(--neu-shadow)" }}>
            <p className="text-3xl font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Final Movie */}
      <div style={{ padding: 24, borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)", marginBottom: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Final Movie</h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              {scenesWithVideo.length}/{scenes.length} scenes have video clips ready
            </p>
          </div>
          <div className="flex gap-2">
            <Button disabled={merging || scenesWithVideo.length < 1} onClick={handleAssembleFinal}>
              {merging ? `Merging ${mergeProgress?.completed || 0}/${mergeProgress?.total || "..."}` : hasFinal ? "Re-assemble Movie" : "Assemble Final Movie"}
            </Button>
            {hasFinal && (
              <a href={project.final_video_url} target="_blank" rel="noopener noreferrer" download>
                <Button variant="secondary">Download</Button>
              </a>
            )}
          </div>
        </div>

        {merging && mergeProgress && mergeProgress.total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(mergeProgress.completed / mergeProgress.total) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-tertiary))", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        {hasFinal && (
          <div style={{ borderRadius: 10, overflow: "hidden", border: "3px solid var(--border)" }}>
            <video src={project.final_video_url} controls style={{ width: "100%", maxHeight: 450, backgroundColor: "#000", display: "block" }} />
          </div>
        )}

        {mergeError && <p className="text-xs mt-3" style={{ color: "#ef4444" }}>{mergeError}</p>}
      </div>

      {/* Scene Assembly Status */}
      <div style={{ padding: 24, borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)", marginBottom: 24 }}>
        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Scene Pipeline Status</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {scenes.map((scene) => (
            <div key={scene.scene_number} className="flex items-center gap-3" style={{ padding: "8px 12px", borderRadius: 8, border: "2px solid var(--surface-3)", backgroundColor: "var(--surface-0)" }}>
              <span className="text-xs font-mono font-bold" style={{ color: "var(--text-dim)", minWidth: 30 }}>{scene.scene_number}</span>
              <span className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{scene.scene_heading}</span>
              <StatusDot done={!!scene.scene_video_url} label="Video" />
              <StatusDot done={!!scene.voiceover_url} label="Voice" />
              <StatusDot done={!!scene.music_url} label="Music" />
              <StatusDot done={!!scene.assembled_url} label="Done" />
            </div>
          ))}
        </div>
      </div>

      {/* Export JSON */}
      <div style={{ padding: 24, borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)" }}>
        <h3 className="text-sm font-medium text-[var(--text)] mb-2">Export Project JSON</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Download the full project data including all scenes, characters, and shot breakdowns.</p>
        <Button variant="secondary" size="sm" onClick={() => {
          const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `${(project.title || "project").replace(/\s+/g, "_")}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }}>
          Download JSON
        </Button>
      </div>
    </div>
  );
}

/* ─── Shots Tab ─── */

export function ShotsTab({ project, projectId }) {
  const [generating, setGenerating] = useState({});
  const [batchProgress, setBatchProgress] = useState(null);

  const handleGenImage = async (sceneNumber, shotNumber) => {
    const key = `img-${sceneNumber}-${shotNumber}`;
    setGenerating((p) => ({ ...p, [key]: true }));
    try {
      await generateShotImage(projectId, sceneNumber, shotNumber);
      await fetchProject(projectId);
    } catch (err) {
      console.error("Shot image generation failed:", err);
    } finally {
      setGenerating((p) => ({ ...p, [key]: false }));
    }
  };

  const handleGenVideo = async (sceneNumber, shotNumber) => {
    const key = `vid-${sceneNumber}-${shotNumber}`;
    setGenerating((p) => ({ ...p, [key]: true }));
    try {
      await generateShotVideo(projectId, sceneNumber, shotNumber);
      await fetchProject(projectId);
    } catch (err) {
      console.error("Shot video generation failed:", err);
    } finally {
      setGenerating((p) => ({ ...p, [key]: false }));
    }
  };

  const handleBatchImages = async (sceneNumber) => {
    setBatchProgress({ type: "images", sceneNumber, completed: 0, total: 0 });
    try {
      await generateAllShotImages(projectId, sceneNumber, (p) => setBatchProgress((prev) => ({ ...prev, ...p })));
    } finally {
      setBatchProgress(null);
    }
  };

  const handleBatchVideos = async (sceneNumber) => {
    setBatchProgress({ type: "videos", sceneNumber, completed: 0, total: 0 });
    try {
      await generateAllShotVideos(projectId, sceneNumber, (p) => setBatchProgress((prev) => ({ ...prev, ...p })));
    } finally {
      setBatchProgress(null);
    }
  };

  const handleAssembleScene = async (sceneNumber) => {
    setBatchProgress({ type: "assemble", sceneNumber, completed: 0, total: 1 });
    try {
      await assembleSceneVideo(projectId, sceneNumber);
    } catch (err) {
      console.error("Scene assembly failed:", err);
    } finally {
      setBatchProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {(project.scenes || []).map((scene) => {
        const totalShots = scene.shots?.length || 0;
        const imagesReady = (scene.shots || []).filter((s) => s.image_url).length;
        const videosReady = (scene.shots || []).filter((s) => s.video_url).length;
        const isBatching = batchProgress?.sceneNumber === scene.scene_number;

        return (
          <div key={scene.scene_number} style={{ borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", padding: 20, boxShadow: "var(--neu-shadow)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Scene {scene.scene_number}: {scene.scene_heading}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  {totalShots} shots · {imagesReady} images · {videosReady} videos
                  {scene.scene_video_url && " · Scene clip ready"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!!batchProgress} onClick={() => handleBatchImages(scene.scene_number)}>
                  {isBatching && batchProgress.type === "images" ? `Images ${batchProgress.completed}/${batchProgress.total}` : "Generate All Images"}
                </Button>
                <Button variant="secondary" size="sm" disabled={!!batchProgress || imagesReady === 0} onClick={() => handleBatchVideos(scene.scene_number)}>
                  {isBatching && batchProgress.type === "videos" ? `Videos ${batchProgress.completed}/${batchProgress.total}` : "Generate All Videos"}
                </Button>
                <Button size="sm" disabled={!!batchProgress || videosReady === 0} onClick={() => handleAssembleScene(scene.scene_number)}>
                  {isBatching && batchProgress.type === "assemble" ? "Assembling..." : scene.scene_video_url ? "Re-assemble" : "Assemble Scene"}
                </Button>
              </div>
            </div>

            {isBatching && batchProgress.total > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(batchProgress.completed / batchProgress.total) * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {scene.scene_video_url && (
              <div style={{ marginBottom: 12, borderRadius: 8, overflow: "hidden", border: "2px solid var(--surface-3)" }}>
                <video src={scene.scene_video_url} controls style={{ width: "100%", maxHeight: 200, backgroundColor: "#000", display: "block" }} />
                <div style={{ padding: "6px 10px", backgroundColor: "var(--surface-0)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Scene clip assembled from {videosReady} shots</span>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {(scene.shots || []).map((shot) => {
                const imgKey = `img-${scene.scene_number}-${shot.shot_number}`;
                const vidKey = `vid-${scene.scene_number}-${shot.shot_number}`;
                const mainImage = shot.image_url || (shot.stills?.length > 0 && shot.stills[0]?.image_url);

                return (
                  <div key={shot.shot_number} style={{ border: "2px solid var(--surface-3)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ aspectRatio: "16/9", backgroundColor: "var(--surface-0)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
                      {shot.video_url ? (
                        <video src={shot.video_url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : mainImage ? (
                        <img src={mainImage} alt={shot.description} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      )}
                      {shot.video_url && (
                        <span style={{ position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(0,0,0,0.7)", color: "#22c55e" }}>VIDEO</span>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent)" }}>Shot {shot.shot_number}</span>
                        {shot.duration_seconds && <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>{shot.duration_seconds}s</span>}
                      </div>
                      <div className="flex gap-1 flex-wrap mb-2">
                        <MetaTag label={shot.shot_size} />
                        <MetaTag label={shot.camera_angle} />
                        <MetaTag label={shot.camera_movement} />
                        <MetaTag label={shot.lighting} />
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)", lineHeight: 1.4, flex: 1 }}>{shot.description}</p>

                      {shot.dialogue?.length > 0 && (
                        <div className="mb-2">
                          {shot.dialogue.map((d, i) => (
                            <p key={i} className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                              <span style={{ color: "var(--accent-tertiary)", fontWeight: 600 }}>{d.character_name}: </span>{d.text}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-auto pt-2">
                        <Button variant="secondary" size="sm" className="flex-1" disabled={generating[imgKey] || !!batchProgress} onClick={() => handleGenImage(scene.scene_number, shot.shot_number)}>
                          {generating[imgKey] ? "..." : mainImage ? "Re-image" : "Image"}
                        </Button>
                        <Button size="sm" className="flex-1" disabled={generating[vidKey] || !mainImage || !!batchProgress} onClick={() => handleGenVideo(scene.scene_number, shot.shot_number)}>
                          {generating[vidKey] ? "..." : shot.video_url ? "Re-video" : "Video"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
