import { useState, useCallback } from "react";
import { useSnapshot } from "valtio";
import { editorStore } from "../../stores/editorStore";
import { sharedAudioRef } from "./AudioPlayer";

export function AudioPanel() {
  const snap = useSnapshot(editorStore);
  const [url, setUrl] = useState(snap.audioUrl || "");
  const [previewing, setPreviewing] = useState(false);

  const stopAudio = useCallback(() => {
    if (sharedAudioRef.current) {
      sharedAudioRef.current.pause();
      sharedAudioRef.current.currentTime = 0;
    }
    setPreviewing(false);
  }, []);

  const handleSetAudio = () => {
    if (url.trim()) {
      stopAudio();
      editorStore.audioUrl = url.trim();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stopAudio();
      const objectUrl = URL.createObjectURL(file);
      editorStore.audioUrl = objectUrl;
      setUrl(file.name);
    }
  };

  const togglePreview = () => {
    const el = sharedAudioRef.current;
    if (!el || !snap.audioUrl) return;
    if (previewing) {
      el.pause();
      setPreviewing(false);
    } else {
      el.play().catch(() => {});
      setPreviewing(true);
    }
  };

  const handleRemove = () => {
    stopAudio();
    editorStore.audioUrl = null;
    setUrl("");
  };

  if (!snap.showAudioPanel || snap.isPlaying) return null;

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 w-72 bg-[var(--border)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg overflow-hidden" style={{ boxShadow: "var(--neu-shadow)" }}>
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Audio</h3>
        <button
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          onClick={() => {
            stopAudio();
            editorStore.showAudioPanel = false;
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Upload File</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="w-full text-[11px] text-[var(--text-muted)] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:bg-[var(--surface-0)] file:text-zinc-300 file:cursor-pointer"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Or paste URL</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetAudio()}
              placeholder="https://..."
              className="flex-1 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-md px-2 py-1 text-[11px] text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)]"
            />
            <button
              onClick={handleSetAudio}
              className="px-2 py-1 text-[11px] bg-[var(--accent)] text-[var(--accent-text)] rounded-md border-2 border-[var(--border)] hover:brightness-110 transition-colors cursor-pointer"
            >
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Volume {Math.round(snap.audioVolume * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={snap.audioVolume}
            onChange={(e) => {
              editorStore.audioVolume = parseFloat(e.target.value);
            }}
            className="w-full accent-[var(--accent)] h-1"
          />
        </div>

        {snap.audioUrl && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePreview}
              className="px-2 py-1 text-[11px] bg-[var(--surface-0)] text-zinc-300 hover:text-[var(--text)] rounded-md transition-colors cursor-pointer"
            >
              {previewing ? "Pause" : "Preview"}
            </button>
            <button
              onClick={handleRemove}
              className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-red-400 rounded-md transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
