import { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  fetchProject, generateEntityImage, updateCharacter, VOICE_PRESETS,
} from "../../stores/movieStore";
import { MetaTag } from "./ShotsExportTabs";

/* ─── Overview Tab ─── */

export function OverviewTab({ project }) {
  return (
    <div>
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

      {project.aesthetic && (
        <div style={{ padding: 16, borderRadius: 10, border: "2px solid var(--surface-3)", backgroundColor: "var(--surface-1)", marginBottom: 16 }}>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Aesthetic: </span>
          <span className="text-sm text-[var(--text)]">{project.aesthetic}</span>
        </div>
      )}

      {project.detected_language && project.detected_language !== "unknown" && (
        <div style={{ padding: 16, borderRadius: 10, border: "2px solid var(--surface-3)", backgroundColor: "var(--surface-1)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Detected Language: </span>
          <span className="text-sm text-[var(--text)]">{project.detected_language}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Characters Tab ─── */

export function CharactersTab({ project, projectId }) {
  const [generating, setGenerating] = useState({});

  const handleGenImage = async (char) => {
    setGenerating((p) => ({ ...p, [char.id]: true }));
    try {
      await generateEntityImage(projectId, "characters", char.id);
      await fetchProject(projectId);
    } catch (err) { console.error("Image gen failed:", err); }
    finally { setGenerating((p) => ({ ...p, [char.id]: false })); }
  };

  const handleVoiceChange = async (char, voiceId) => {
    try {
      await updateCharacter(projectId, char.id, { voice_id: voiceId });
      await fetchProject(projectId);
    } catch (err) { console.error("Voice update failed:", err); }
  };

  // Non-visual characters (voices, whispers, narrators, etc.) don't need image generation
  const isVisualCharacter = (char) => {
    const name = (char.name || "").toLowerCase();
    const desc = (char.description || "").toLowerCase();
    const nonVisual = ["voice", "whisper", "narrator", "sound", "noise", "presence", "spirit", "echo"];
    if (nonVisual.some((kw) => name.includes(kw))) return false;
    if (desc.includes("disembodied") || desc.includes("unseen") || desc.includes("invisible") || desc.includes("off-screen")) return false;
    return true;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {(project.characters || []).map((char) => {
        const isVisual = isVisualCharacter(char);
        return (
          <div key={char.id} style={{ borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", overflow: "hidden", boxShadow: "var(--neu-shadow)", display: "flex", flexDirection: "column" }}>
            {isVisual ? (
              char.image_url ? (
                <div className="h-56 overflow-hidden shrink-0" style={{ backgroundColor: "var(--surface-0)" }}><img src={char.image_url} alt={char.name} className="w-full h-full object-contain" /></div>
              ) : (
                <div className="h-48 flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-0)" }}>
                  <svg className="w-12 h-12" style={{ color: "var(--surface-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                  </svg>
                </div>
              )
            ) : (
              <div className="h-48 flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-0)" }}>
                <svg className="w-12 h-12" style={{ color: "var(--surface-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              </div>
            )}
            <div className="p-3.5" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-[var(--text)]">{char.name}</h3>
                <Badge variant={char.tier === "primary" ? "info" : "default"}>{char.tier}</Badge>
                {!isVisual && <Badge variant="default">voice-only</Badge>}
              </div>
              <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--text-muted)", flex: 1 }}>{char.description}</p>
              {char.metadata && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {char.metadata.age_range && <MetaTag label={char.metadata.age_range} />}
                  {char.metadata.gender && <MetaTag label={char.metadata.gender} />}
                  {char.metadata.build && <MetaTag label={char.metadata.build} />}
                </div>
              )}
              <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{char.scene_ids?.length || 0} scenes · {char.dialogue_count || 0} lines</span>

              {/* Voice Selection */}
              {char.dialogue_count > 0 && (
                <div className="mt-2">
                  <label className="text-[9px] uppercase font-medium" style={{ color: "var(--text-dim)", letterSpacing: "0.05em" }}>Voice</label>
                  <select
                    value={char.voice_id || ""}
                    onChange={(e) => handleVoiceChange(char, e.target.value)}
                    style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "2px solid var(--surface-3)", backgroundColor: "var(--surface-0)", color: "var(--text)", fontSize: 11, fontFamily: "inherit", cursor: "pointer", marginTop: 2 }}
                  >
                    <option value="">Auto-assign</option>
                    {VOICE_PRESETS.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {isVisual && (
                <Button variant="secondary" size="sm" className="w-full mt-2" disabled={generating[char.id]} onClick={() => handleGenImage(char)}>
                  {generating[char.id] ? "Generating..." : char.image_url ? "Regenerate" : "Generate Image"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Locations Tab ─── */

export function LocationsTab({ project, projectId }) {
  const [generating, setGenerating] = useState({});

  const handleGenImage = async (loc) => {
    setGenerating((p) => ({ ...p, [loc.id]: true }));
    try {
      await generateEntityImage(projectId, "locations", loc.id);
      await fetchProject(projectId);
    } catch (err) { console.error("Image gen failed:", err); }
    finally { setGenerating((p) => ({ ...p, [loc.id]: false })); }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {(project.locations || []).map((loc) => (
        <div key={loc.id} style={{ borderRadius: 12, border: "3px solid var(--border)", backgroundColor: "var(--surface-1)", overflow: "hidden", boxShadow: "var(--neu-shadow)" }}>
          {loc.image_url ? (
            <div className="h-48 overflow-hidden" style={{ backgroundColor: "var(--surface-0)" }}><img src={loc.image_url} alt={loc.name} className="w-full h-full object-contain" /></div>
          ) : (
            <div className="h-40 flex items-center justify-center" style={{ backgroundColor: "var(--surface-0)" }}>
              <svg className="w-10 h-10" style={{ color: "var(--surface-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
          )}
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-[var(--text)]">{loc.name}</h3>
              <Badge variant="default">{loc.int_ext}</Badge>
            </div>
            <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--text-muted)" }}>{loc.full_description}</p>
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{loc.scene_ids?.length || 0} scenes</span>
            <Button variant="secondary" size="sm" className="w-full mt-2" disabled={generating[loc.id]} onClick={() => handleGenImage(loc)}>
              {generating[loc.id] ? "Generating..." : loc.image_url ? "Regenerate" : "Generate Image"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
