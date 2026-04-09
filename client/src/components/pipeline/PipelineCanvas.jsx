import { useState, useRef, useEffect, useCallback } from "react";
import { useSnapshot } from "valtio";
import { pipelineStore, moveNode } from "../../stores/pipelineStore";
import { PipelineNode } from "./nodes/PipelineNode";

const MIN_ZOOM = 0.3, MAX_ZOOM = 2, ZOOM_STEP = 0.08;

export function PipelineCanvas() {
  const snap = useSnapshot(pipelineStore);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const canvasDrag = useRef(null);
  const nodeDrag = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (snap.nodes.length === 0) { setPan({ x: 0, y: 0 }); return; }
    const el = containerRef.current; if (!el) return;
    const timer = setTimeout(() => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pipelineStore.nodes.forEach((n) => { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x + n.w > maxX) maxX = n.x + n.w; if (n.y + (n.h || 200) > maxY) maxY = n.y + (n.h || 200); });
      if (minX === Infinity) return;
      const gw = maxX - minX, gh = maxY - minY, cw = el.clientWidth, ch = el.clientHeight;
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(cw / (gw + 120), ch / (gh + 120), 1)));
      setZoom(z); setPan({ x: (cw - gw * z) / 2 - minX * z, y: (ch - gh * z) / 2 - minY * z });
    }, 300);
    return () => clearTimeout(timer);
  }, [snap.nodes.length]);

  const onWheel = useCallback((e) => {
    e.preventDefault(); const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return;
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
    const scale = newZoom / zoom;
    setPan({ x: mouseX - (mouseX - pan.x) * scale, y: mouseY - (mouseY - pan.y) * scale }); setZoom(newZoom);
  }, [zoom, pan]);

  useEffect(() => { const el = containerRef.current; if (!el) return; el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel); }, [onWheel]);

  const onMouseDown = useCallback((e) => { if (e.target.closest("[data-node-drag]") || e.target.closest("textarea, select, button, input, label, video, img, a") || e.button !== 0) return; canvasDrag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }; }, [pan]);
  const onMouseMove = useCallback((e) => { if (nodeDrag.current) { const { nodeId, sx, sy, ox, oy } = nodeDrag.current; moveNode(nodeId, ox + (e.clientX - sx) / zoom, oy + (e.clientY - sy) / zoom); return; } if (canvasDrag.current) { setPan({ x: canvasDrag.current.px + (e.clientX - canvasDrag.current.sx), y: canvasDrag.current.py + (e.clientY - canvasDrag.current.sy) }); } }, [zoom]);
  const onMouseUp = useCallback(() => { canvasDrag.current = null; nodeDrag.current = null; }, []);
  const startNodeDrag = useCallback((e, nodeId) => { e.stopPropagation(); const node = pipelineStore.nodes.find((n) => n.id === nodeId); if (!node) return; nodeDrag.current = { nodeId, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }; }, []);
  const onDoubleClick = useCallback((e) => { if (e.target.closest("[data-node-drag], textarea, select, button, input, label, video, img")) return; fitToView(); }, []);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP * 2));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP * 2));
  const fitToView = () => {
    if (snap.nodes.length === 0) return; const el = containerRef.current; if (!el) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pipelineStore.nodes.forEach((n) => { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x + n.w > maxX) maxX = n.x + n.w; if (n.y + (n.h || 200) > maxY) maxY = n.y + (n.h || 200); });
    const gw = maxX - minX, gh = maxY - minY, cw = el.clientWidth, ch = el.clientHeight;
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(cw / (gw + 160), ch / (gh + 160), 1.2)));
    setZoom(z); setPan({ x: (cw - gw * z) / 2 - minX * z, y: (ch - gh * z) / 2 - minY * z });
  };

  const gridSize = 24 * zoom;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "var(--surface-0)", cursor: nodeDrag.current ? "grabbing" : canvasDrag.current ? "grabbing" : "grab" }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onDoubleClick={onDoubleClick}>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `radial-gradient(var(--surface-3) 1px, transparent 1px)`, backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${pan.x % gridSize}px ${pan.y % gridSize}px` }} />

      <div style={{ position: "absolute", inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
        {snap.edges.length > 0 && (
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1, overflow: "visible" }}>
            {snap.edges.map((edge) => {
              const fn = snap.nodes.find((n) => n.id === edge.from), tn = snap.nodes.find((n) => n.id === edge.to);
              if (!fn || !tn) return null;
              const ax = fn.x + fn.w + 6, ay = fn.y + (fn.h || 200) / 2, bx = tn.x - 6, by = tn.y + (tn.h || 200) / 2;
              const dx = Math.max(Math.abs(bx - ax) * 0.4, 80);
              const path = `M${ax},${ay} C${ax + dx},${ay} ${bx - dx},${by} ${bx},${by}`;
              const active = pipelineStore.nodes.find((n) => n.id === edge.from)?.data?.status === "done";
              return <path key={edge.id} d={path} fill="none" stroke={active ? "var(--text-dim)" : "var(--surface-3)"} strokeWidth={2} strokeLinecap="round" />;
            })}
          </svg>
        )}

        {snap.nodes.map((node) => {
          const ports = [], cy = node.y + (node.h || 200) / 2;
          if (!["prompt", "imageInput"].includes(node.nodeType)) ports.push(<div key={`${node.id}-in`} style={{ position: "absolute", left: node.x - 6, top: cy - 6, width: 12, height: 12, borderRadius: "50%", background: "var(--surface-1)", border: "2px solid var(--surface-3)", zIndex: 3 }} />);
          if (node.nodeType !== "output") { const a = node.data?.status === "done"; ports.push(<div key={`${node.id}-out`} style={{ position: "absolute", left: node.x + node.w - 6, top: cy - 6, width: 12, height: 12, borderRadius: "50%", background: a ? "var(--accent)" : "var(--surface-1)", border: `2px solid ${a ? "var(--accent)" : "var(--surface-3)"}`, zIndex: 3 }} />); }
          return ports;
        })}

        {snap.nodes.map((n) => <PipelineNode key={n.id} node={n} onDragStart={startNodeDrag} />)}
      </div>

      {snap.nodes.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6.5 7.5L10.5 10.5M17.5 7.5L13.5 10.5M12 14v4"/></svg>
          <p style={{ color: "var(--text-dim)", fontSize: 14, fontWeight: 400 }}>Select a pipeline or describe one</p>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 2, background: "var(--surface-1)", borderRadius: 10, border: "2px solid var(--surface-3)", padding: 3, boxShadow: "var(--neu-shadow-sm)" }}>
        <button onClick={zoomOut} style={zoomBtnStyle}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 500, minWidth: 36, textAlign: "center", userSelect: "none" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} style={zoomBtnStyle}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <button onClick={fitToView} style={zoomBtnStyle}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
      </div>
      <style>{`@keyframes p-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const zoomBtnStyle = { width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
