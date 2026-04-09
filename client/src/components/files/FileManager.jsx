import { useRef, useState, useCallback } from "react";
import { useSnapshot } from "valtio";
import { assetStore, addAsset, deleteAsset, uploadToFalStorage } from "../../stores/assetStore";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cardStyle, inputStyle, pagePadding, fixedGrid } from "../../utils/theme";

const FILTER_TABS = [
  { label: "All", value: null },
  { label: "Images", value: "image" },
  { label: "Audio", value: "audio" },
  { label: "3D Models", value: "model" },
  { label: "Scripts", value: "script" },
  { label: "Video", value: "video" },
];

const ACCEPT = "image/*,audio/*,.glb,.obj,.txt,.pdf";

function mimeToType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("gltf") || mime.includes("octet-stream")) return "model";
  return "script";
}

function extToType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "aac", "flac"].includes(ext)) return "audio";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["glb", "gltf", "obj", "fbx"].includes(ext)) return "model";
  return "script";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round">
      <line x1="4" y1="8" x2="4" y2="16" />
      <line x1="8" y1="5" x2="8" y2="19" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="16" y1="7" x2="16" y2="17" />
      <line x1="20" y1="10" x2="20" y2="14" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--surface-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function AssetThumbnail({ asset }) {
  if (asset.type === "image") {
    return (
      <img
        src={asset.thumbnail || asset.url}
        alt={asset.name}
        className="w-full object-cover"
        style={{ height: 160 }}
      />
    );
  }

  if (asset.type === "audio") {
    return (
      <div className="w-full flex flex-col items-center justify-center" style={{ height: 160, backgroundColor: "var(--surface-0)", gap: 8 }}>
        <WaveformIcon />
        <span className="text-xs truncate" style={{ color: "var(--text-muted)", maxWidth: "100%", padding: "0 16px" }}>{asset.name}</span>
      </div>
    );
  }

  if (asset.type === "model") {
    return (
      <div className="w-full flex flex-col items-center justify-center" style={{ height: 160, backgroundColor: "var(--surface-0)", gap: 8 }}>
        <CubeIcon />
        <span className="text-xs truncate" style={{ color: "var(--text-muted)", maxWidth: "100%", padding: "0 16px" }}>{asset.name}</span>
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="w-full flex flex-col items-center justify-center" style={{ height: 160, backgroundColor: "var(--surface-0)", gap: 8 }}>
        <VideoIcon />
        <span className="text-xs truncate" style={{ color: "var(--text-muted)", maxWidth: "100%", padding: "0 16px" }}>{asset.name}</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center" style={{ height: 160, backgroundColor: "var(--surface-0)", gap: 8 }}>
      <DocumentIcon />
      <span className="text-xs truncate" style={{ color: "var(--text-muted)", maxWidth: "100%", padding: "0 16px" }}>{asset.name}</span>
    </div>
  );
}

function AssetCard({ asset, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const sourceBadge = asset.source === "ai-generated" ? "AI" : asset.source === "url" ? "URL" : "Upload";
  const sourceBadgeVariant = asset.source === "ai-generated" ? "info" : "default";
  const hasFalUrl = !!asset.falUrl;

  return (
    <div
      className="relative group transition-colors duration-150"
      style={{ ...cardStyle, overflow: "hidden" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AssetThumbnail asset={asset} />

      {hovered && (
        <button
          onClick={() => onDelete(asset.id)}
          className="absolute top-2 right-2 transition-colors duration-150 cursor-pointer"
          style={{
            padding: 6,
            borderRadius: 8,
            backgroundColor: "var(--surface-0)",
            border: "2px solid var(--surface-3)",
            color: "var(--text-muted)",
          }}
        >
          <TrashIcon />
        </button>
      )}

      <div style={{ padding: 12 }}>
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{asset.name}</p>
        <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
          <Badge>{asset.type}</Badge>
          <Badge variant={sourceBadgeVariant}>{sourceBadge}</Badge>
          {asset.source === "upload" && (
            <Badge variant={hasFalUrl ? "info" : "default"}>
              {hasFalUrl ? "Synced" : "Local"}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-muted)", marginTop: 8 }}>
          <span>{formatDate(asset.createdAt)}</span>
          <span>{formatSize(asset.size)}</span>
        </div>
      </div>
    </div>
  );
}

export function FileManager() {
  const snap = useSnapshot(assetStore);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files) => {
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const type = file.type ? mimeToType(file.type) : extToType(file.name);
      const assetId = addAsset({
        name: file.name,
        type,
        mimeType: file.type,
        url,
        thumbnail: type === "image" ? url : null,
        size: file.size,
        source: "upload",
      });
      // Upload to fal.ai storage in the background for pipeline use
      uploadToFalStorage(assetId, file);
    });
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onFileSelect = useCallback(
    (e) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles],
  );

  const activeFilter = snap.filter.type;
  const search = snap.filter.search;

  const filteredAssets = snap.assets.filter((a) => {
    if (activeFilter && a.type !== activeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-auto">
      <div style={pagePadding}>
        {/* Header provided by PageHeader */}

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className="flex flex-col items-center justify-center cursor-pointer transition-colors duration-150"
          style={{
            borderRadius: 12,
            padding: 32,
            marginBottom: 24,
            gap: 12,
            border: dragOver
              ? "3px dashed var(--accent)"
              : "3px dashed var(--surface-3)",
            backgroundColor: dragOver
              ? "rgba(255,214,10,0.05)"
              : "transparent",
          }}
        >
          <UploadIcon />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drag files here or click to upload</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={onFileSelect}
            className="hidden"
          />
        </div>

        {/* Filter tabs + search */}
        <div className="flex items-center justify-between" style={{ gap: 16, marginBottom: 24 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => (assetStore.filter.type = tab.value)}
                className="text-xs font-medium transition-colors duration-150 cursor-pointer"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: activeFilter === tab.value
                    ? "2px solid var(--border)"
                    : "2px solid var(--surface-3)",
                  background: activeFilter === tab.value
                    ? "var(--accent)"
                    : "var(--surface-0)",
                  color: activeFilter === tab.value
                    ? "var(--accent-text)"
                    : "var(--text-muted)",
                  fontWeight: activeFilter === tab.value ? 600 : 400,
                  boxShadow: activeFilter === tab.value ? "var(--neu-shadow-sm)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search files..."
              value={snap.filter.search}
              onChange={(e) => (assetStore.filter.search = e.target.value)}
              className="text-sm focus:outline-none transition-colors duration-150"
              style={{
                ...inputStyle,
                width: 256,
                paddingLeft: 36,
                color: "var(--text)",
              }}
            />
          </div>
        </div>

        {/* Asset grid or empty state */}
        {filteredAssets.length > 0 ? (
          <div style={fixedGrid(4)}>
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onDelete={deleteAsset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ padding: "96px 0", gap: 16 }}>
            <FolderIcon />
            <p className="text-lg font-medium" style={{ color: "var(--text-muted)" }}>No files yet</p>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Upload files or generate images in the Studio
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
