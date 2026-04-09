import { useSnapshot } from "valtio";
import { assetStore } from "../../../stores/assetStore";
import { studioStore } from "../../../stores/studioStore";

export function useImageAssets() {
  const assetSnap = useSnapshot(assetStore);
  const studioSnap = useSnapshot(studioStore);
  const images = [];
  assetSnap.assets.forEach((a) => { if (a.type === "image" && a.url) images.push({ id: a.id, name: a.name || "Uploaded image", url: a.falUrl || a.url, localUrl: a.url, source: "assets" }); });
  studioSnap.generations.forEach((g) => { if (g.imageUrl && g.status === "complete") images.push({ id: g.id, name: g.prompt?.slice(0, 40) || "Generated image", url: g.imageUrl, source: "studio" }); });
  return images;
}

export function AssetPicker({ query, onSelect, onClose }) {
  const images = useImageAssets();
  const filtered = query ? images.filter((img) => img.name.toLowerCase().includes(query.toLowerCase())) : images;

  if (filtered.length === 0) return (
    <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 6, background: "var(--surface-1)", border: "2px solid var(--surface-3)", borderRadius: 14, padding: 14, zIndex: 50, boxShadow: "var(--neu-shadow)" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>{images.length === 0 ? "No images found. Upload in Files or generate in Studio." : "No matching images."}</p>
    </div>
  );

  return (
    <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 6, background: "var(--surface-1)", border: "2px solid var(--surface-3)", borderRadius: 14, padding: 10, zIndex: 50, maxHeight: 260, overflowY: "auto", boxShadow: "var(--neu-shadow)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)", padding: "2px 6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Select an image</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, padding: 0 }}>x</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {filtered.slice(0, 12).map((img) => (
          <button key={img.id} onClick={() => onSelect(img)} style={{ padding: 0, border: "2px solid var(--surface-3)", borderRadius: 10, background: "var(--surface-0)", cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--surface-3)"}>
            <img src={img.localUrl || img.url} alt="" style={{ width: "100%", height: 64, objectFit: "cover" }} />
            <div style={{ padding: "4px 6px", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{img.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
