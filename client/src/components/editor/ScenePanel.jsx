import { useSnapshot } from "valtio";
import { editorStore, selectObject, removeObject, duplicateObject } from "../../stores/editorStore";
import { cn } from "../../utils/cn";

export function ScenePanel() {
  const snap = useSnapshot(editorStore);

  return (
    <div className="w-52 border-r border-[var(--border)] flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--border)" }}>
      <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Objects</h3>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {snap.objects.length === 0 ? (
          <p className="text-[var(--text-dim)] text-xs text-center py-8 px-2">Add objects from the toolbar</p>
        ) : (
          snap.objects.map((obj) => (
            <div
              key={obj.id}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs",
                snap.selectedId === obj.id ? "bg-[var(--accent)20] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-1)]/50 hover:text-zinc-200",
              )}
              onClick={() => selectObject(obj.id)}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
              <span className="flex-1 truncate">{obj.name}</span>

              {obj.animation !== "none" && <span className="text-[9px] text-[var(--text-muted)] bg-[var(--surface-0)] px-1 rounded">{obj.animation}</span>}

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-0.5 hover:text-[var(--text)] transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateObject(obj.id);
                  }}
                  title="Duplicate"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M9 3V2a1 1 0 00-1-1H2a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button
                  className="p-0.5 hover:text-red-400 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject(obj.id);
                  }}
                  title="Delete"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
