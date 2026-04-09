import { useSnapshot } from "valtio";
import { editorStore, addObject } from "../../stores/editorStore";
import { worldStore, saveCurrentWorld } from "../../stores/worldStore";
import { getEditorData } from "../../stores/editorStore";
import { navigate } from "../../stores/appStore";
import { cn } from "../../utils/cn";

const primitiveTypes = [
  { type: "box", label: "Cube" },
  { type: "sphere", label: "Sphere" },
  { type: "cylinder", label: "Cylinder" },
  { type: "cone", label: "Cone" },
  { type: "torus", label: "Torus" },
];

const transformModes = [
  { mode: "translate", label: "Move", key: "W" },
  { mode: "rotate", label: "Rotate", key: "E" },
  { mode: "scale", label: "Scale", key: "R" },
];

export function Toolbar({ onCreateCharacter }) {
  const snap = useSnapshot(editorStore);
  const worldSnap = useSnapshot(worldStore);
  const currentWorld = worldSnap.worlds.find((w) => w.id === worldSnap.currentWorldId);

  const handleSaveAndClose = () => {
    saveCurrentWorld(getEditorData());
    navigate("/worlds");
  };

  const handlePlay = () => {
    editorStore.isPlaying = !editorStore.isPlaying;
    editorStore.selectedId = null;
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--border)] border-b border-[var(--border)] shrink-0">
      {/* Back */}
      <button
        onClick={handleSaveAndClose}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded-md hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="h-4 w-px bg-[var(--surface-3)]" />

      <span className="text-[var(--text)] text-xs font-medium truncate max-w-32 px-1">{currentWorld?.name}</span>

      <div className="h-4 w-px bg-[var(--surface-3)]" />

      {/* Transform modes */}
      {!snap.isPlaying && (
        <>
          <div className="flex gap-px bg-[var(--surface-0)] rounded-md p-px">
            {transformModes.map(({ mode, label, key }) => (
              <button
                key={mode}
                className={cn(
                  "px-2 py-1 text-[11px] rounded transition-colors cursor-pointer",
                  snap.transformMode === mode ? "" : "text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
                style={
                  snap.transformMode === mode
                    ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }
                    : undefined
                }
                onClick={() => {
                  editorStore.transformMode = mode;
                }}
                title={`${label} (${key})`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--surface-3)]" />

          {/* Add primitives */}
          <div className="flex gap-px">
            {primitiveTypes.map(({ type, label }) => (
              <button
                key={type}
                className="px-1.5 py-1 text-[11px] rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
                onClick={() => addObject(type)}
                title={`Add ${label}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--surface-3)]" />

          {/* Character button - opens AI creator */}
          <button
            onClick={onCreateCharacter}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md bg-[var(--surface-0)] text-zinc-300 hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer border border-[var(--surface-3)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM8 12h8M12 10v8M9 18l-1 4M15 18l1 4" />
            </svg>
            + Character
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* Right side */}
      {!snap.isPlaying && (
        <>
          <button
            onClick={() => {
              editorStore.showAIPanel = !editorStore.showAIPanel;
            }}
            className={cn(
              "px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer",
              snap.showAIPanel ? "" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)]",
            )}
            style={snap.showAIPanel ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" } : undefined}
          >
            AI
          </button>

          <button
            onClick={() => {
              editorStore.showAudioPanel = !editorStore.showAudioPanel;
            }}
            className={cn(
              "px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer",
              snap.showAudioPanel ? "" : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)]",
            )}
            style={snap.showAudioPanel ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" } : undefined}
          >
            Audio
          </button>
        </>
      )}

      <div className="h-4 w-px bg-[var(--surface-3)]" />

      <button
        onClick={handlePlay}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
          snap.isPlaying
            ? "bg-red-600 text-[var(--text)] hover:bg-red-500 border-2 border-[var(--border)]"
            : "bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-110 border-2 border-[var(--border)]",
        )}
        style={!snap.isPlaying ? { boxShadow: "var(--neu-shadow)" } : { boxShadow: "var(--neu-shadow)" }}
      >
        {snap.isPlaying ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
            Stop
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1l7 4-7 4V1z" />
            </svg>
            Play
          </>
        )}
      </button>
    </div>
  );
}
