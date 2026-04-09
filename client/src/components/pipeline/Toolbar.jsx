import { useSnapshot } from "valtio";
import {
  pipelineStore, clearPipeline, runFullPipeline, reRunPipeline,
  buildDefaultImagePipeline, buildDefaultVideoPipeline, buildImageToVideoPipeline, buildVideoMergePipeline, buildVideoAudioMergePipeline,
} from "../../stores/pipelineStore";
import { statusRunning } from "../../utils/theme";

export function Toolbar() {
  const snap = useSnapshot(pipelineStore);
  const hasNodes = snap.nodes.length > 0;
  const hasDoneNodes = snap.nodes.some((n) => n.data?.status === "done");

  const tools = [
    { label: "Image", icon: "img", action: buildDefaultImagePipeline },
    { label: "Video", icon: "vid", action: buildDefaultVideoPipeline },
    { label: "Image + Video", icon: "both", action: buildImageToVideoPipeline },
    { label: "Merge Videos", icon: "merge", action: buildVideoMergePipeline },
    { label: "V+A Merge", icon: "audio", action: buildVideoAudioMergePipeline },
  ];

  const iconMap = {
    img: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
    vid: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/></svg>,
    both: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
    merge: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 6l4 4 4-4M8 18l4-4 4 4"/></svg>,
    audio: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  };

  return (
    <div style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "0 14px", borderBottom: "2px solid var(--border)", background: "var(--surface-1)" }}>
      {tools.map((t) => (
        <button key={t.label} onClick={t.action} disabled={snap.running} style={{
          padding: "6px 12px", borderRadius: 10, border: "none", background: "transparent",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 500, cursor: snap.running ? "not-allowed" : "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s, background 0.15s",
          opacity: snap.running ? 0.4 : 1,
        }}>{iconMap[t.icon]}{t.label}</button>
      ))}

      {hasNodes && <div style={{ width: 1, height: 20, background: "var(--surface-3)", margin: "0 6px" }} />}
      {hasNodes && (
        <button onClick={clearPipeline} disabled={snap.running} style={{
          padding: "6px 10px", borderRadius: 10, border: "none", background: "transparent",
          color: "var(--text-dim)", fontSize: 13, fontWeight: 500, cursor: snap.running ? "not-allowed" : "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, opacity: snap.running ? 0.4 : 1,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>Clear
        </button>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {snap.pipelineTitle && <span style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 500, marginRight: 4 }}>{snap.pipelineTitle}</span>}
        {hasDoneNodes && !snap.running && (
          <button onClick={reRunPipeline} style={{ padding: "6px 12px", borderRadius: 10, border: "none", background: "transparent", color: statusRunning, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Re-run
          </button>
        )}
        {hasNodes && !snap.running && (
          <button onClick={runFullPipeline} style={{ padding: "6px 18px", borderRadius: 10, border: "2px solid var(--border)", background: "var(--accent)", color: "var(--accent-text)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "var(--neu-shadow-sm)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>Run
          </button>
        )}
        {snap.running && (
          <div style={{ padding: "6px 14px", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusRunning} strokeWidth="2.5" style={{ animation: "p-spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            <span style={{ color: statusRunning, fontSize: 13, fontWeight: 500 }}>Running</span>
          </div>
        )}
      </div>
    </div>
  );
}
