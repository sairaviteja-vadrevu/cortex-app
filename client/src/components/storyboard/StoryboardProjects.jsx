import { useState, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { movieStore, fetchProjects, fetchProviders, createStoryboardProject, deleteStoryboardProject } from "../../stores/movieStore";
import { navigate } from "../../stores/appStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { cn } from "../../utils/cn";

const statusVariant = {
  ready: "success",
  processing: "warning",
  error: "error",
  cancelled: "default",
};

export function StoryboardProjects() {
  const { projects, projectsLoading, providers } = useSnapshot(movieStore);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchProviders();
  }, []);

  const handleDelete = async (projectId) => {
    setDeleting(true);
    try {
      await deleteStoryboardProject(projectId);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 sm:p-8 pb-24">
        {/* Header provided by PageHeader */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Projects
            <span style={{ color: "var(--text-dim)" }} className="ml-2">{projects.length}</span>
          </h2>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Project
          </Button>
        </div>

        <div className="h-px mb-8" style={{ backgroundColor: "var(--surface-3)" }} />

        {projectsLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin text-[var(--text-muted)]">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: "var(--surface-1)", border: "2px solid var(--surface-3)" }}>
              <svg className="w-6 h-6" style={{ color: "var(--text-dim)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m17.25 12.75c0 .621-.504 1.125-1.125 1.125" />
              </svg>
            </div>
            <p style={{ color: "var(--text-muted)" }} className="text-sm mb-1">No projects yet</p>
            <p style={{ color: "var(--text-dim)" }} className="text-sm mb-8">Create your first storyboard project to get started</p>
            <Button onClick={() => setShowCreate(true)}>Create Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...projects].reverse().map((proj) => (
              <div
                key={proj.project_id}
                className={cn("group relative rounded-lg transition-all duration-200 cursor-pointer overflow-hidden hover:translate-y-[-2px]")}
                style={{ backgroundColor: "var(--surface-1)", border: "3px solid var(--border)", boxShadow: "var(--neu-shadow)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                onClick={() => navigate(`/storyboard/${proj.project_id}`)}
              >
                <div className="h-32 flex items-center justify-center" style={{ backgroundColor: "var(--surface-0)" }}>
                  <div className="text-center">
                    <span className="text-3xl font-bold" style={{ color: "var(--surface-3)" }}>{proj.total_scenes}</span>
                    <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>scenes</p>
                  </div>
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[var(--text)] text-sm font-medium truncate">{proj.title}</h3>
                    <Badge variant={statusVariant[proj.status] || "default"}>{proj.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {proj.genre && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--text-dim)", backgroundColor: "var(--surface-0)" }}>
                        {proj.genre}
                      </span>
                    )}
                    <span style={{ color: "var(--text-dim)" }} className="text-xs">{proj.total_characters} chars</span>
                    <span style={{ color: "var(--surface-3)" }} className="text-[10px]">·</span>
                    <span style={{ color: "var(--text-dim)" }} className="text-xs">{proj.llm_provider}</span>
                    <span style={{ color: "var(--surface-3)" }} className="text-[10px]">·</span>
                    <span style={{ color: "var(--text-dim)" }} className="text-xs">
                      {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(proj.project_id); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-.867 12.142A2 2 0 0116.138 20H7.862a2 2 0 01-1.995-1.858L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} providers={[...providers]} />

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Project?">
        <p style={{ color: "var(--text-muted)" }} className="text-sm mb-6">
          This will permanently delete this project and all its scenes, characters, and generated content.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" disabled={deleting} onClick={() => handleDelete(deleteConfirm)}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CreateProjectModal({ open, onClose, providers }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [aesthetic, setAesthetic] = useState("");
  const [duration, setDuration] = useState("");
  const [visualStyle, setVisualStyle] = useState("live-action-realistic");
  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [scriptFile, setScriptFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const reset = () => {
    setTitle(""); setGenre(""); setAesthetic(""); setDuration("");
    setVisualStyle("live-action-realistic"); setProvider("google"); setModel("");
    setScriptText(""); setScriptFile(null); setNotes(""); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const selectedProvider = providers.find((p) => p.provider === provider);
  const models = selectedProvider?.models || [];

  const handleCreate = async () => {
    if (!title.trim() || (!scriptText.trim() && !scriptFile)) return;
    setCreating(true);
    setError("");
    try {
      const result = await createStoryboardProject({
        title: title.trim(),
        scriptFile,
        scriptText: scriptFile ? null : scriptText,
        genre: genre.trim() || null,
        aesthetic: aesthetic.trim() || null,
        durationMinutes: duration ? parseFloat(duration) : null,
        llmProvider: provider,
        llmModel: model || null,
        visualStyle,
        notes: notes.trim() || null,
      });
      handleClose();
      navigate(`/storyboard/${result.project_id}`);
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = {
    width: "100%", backgroundColor: "var(--surface-0)", border: "2px solid var(--surface-3)",
    borderRadius: 8, padding: "10px 16px", color: "var(--text)", fontSize: 14, outline: "none",
  };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };

  const VISUAL_STYLES = [
    { value: "live-action-realistic", label: "Live Action (Realistic)" },
    { value: "live-action-stylized", label: "Live Action (Stylized)" },
    { value: "animation-3d", label: "3D Animation" },
    { value: "animation-2d", label: "2D Animation" },
    { value: "anime", label: "Anime" },
    { value: "concept-art", label: "Concept Art" },
    { value: "graphic-novel", label: "Graphic Novel" },
  ];

  return (
    <Modal open={open} onClose={handleClose} title="New Storyboard Project" className="max-w-2xl">
      <div className="space-y-4 scrollbar-hide" style={{ maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" }}>
        <div>
          <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title..." autoFocus style={inputStyle} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Genre</label>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Sci-Fi, Drama..." style={inputStyle} />
          </div>
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Duration (minutes)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 90" style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Visual Style</label>
            <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} style={selectStyle}>
              {VISUAL_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Aesthetic</label>
            <input type="text" value={aesthetic} onChange={(e) => setAesthetic(e.target.value)} placeholder="e.g. Noir, Neon, Vintage..." style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">LLM Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); }} style={selectStyle}>
              {providers.length > 0 ? (
                providers.map((p) => <option key={p.provider} value={p.provider}>{p.provider}</option>)
              ) : (
                <option value="google">google</option>
              )}
            </select>
          </div>
          <div>
            <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
              <option value="">Default</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Script *</label>
          <div className="flex items-center gap-3 mb-2">
            <input ref={fileRef} type="file" accept=".txt,.fountain,.fdx,.pdf" className="hidden" onChange={(e) => { setScriptFile(e.target.files?.[0] || null); e.target.value = ""; }} />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              Upload File
            </Button>
            {scriptFile && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {scriptFile.name}
                <button className="ml-2 text-red-400 cursor-pointer" onClick={() => setScriptFile(null)}>x</button>
              </span>
            )}
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>PDF, FDX, Fountain, TXT</span>
          </div>
          {!scriptFile && (
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={6}
              placeholder="Or paste your screenplay text here..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
          )}
        </div>

        <div>
          <label style={{ color: "var(--text-muted)" }} className="text-xs mb-1 block">Director's Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any specific instructions for the AI..." style={{ ...inputStyle, resize: "none", fontSize: 13 }} />
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 8, backgroundColor: "rgba(255,107,107,0.1)" }}>
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim() || (!scriptText.trim() && !scriptFile)}>
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
