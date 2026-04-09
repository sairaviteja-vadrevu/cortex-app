
import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "g5-assets";
const shortId = () => crypto.randomUUID().split("-")[0];

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const assetStore = proxy({
  assets: loadFromStorage(),
  filter: { type: null, search: "" },
});

subscribe(assetStore, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assetStore.assets));
});

export const addAsset = (data) => {
  const asset = {
    id: shortId(),
    name: "",
    type: "image",
    mimeType: "",
    url: "",
    falUrl: null, // fal.ai storage URL for API access
    thumbnail: null,
    size: 0,
    createdAt: Date.now(),
    tags: [],
    source: "upload",
    ...data,
  };
  assetStore.assets.unshift(asset);
  return asset.id;
};

export const updateAsset = (id, patch) => {
  const asset = assetStore.assets.find((a) => a.id === id);
  if (asset) Object.assign(asset, patch);
};

export const deleteAsset = (id) => {
  const idx = assetStore.assets.findIndex((a) => a.id === id);
  if (idx !== -1) assetStore.assets.splice(idx, 1);
};

export const getAssetsByType = (type) => {
  if (!type) return assetStore.assets;
  return assetStore.assets.filter((a) => a.type === type);
};

/**
 * Store asset URL for pipeline use.
 * Previously uploaded to fal.ai storage; now assets use their local URL directly.
 */
export async function uploadToFalStorage(assetId, file) {
  // No-op: assets are referenced by their local URL now
}
