import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "g5-worlds";

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Generate a short readable ID (8 chars)
const shortId = () => crypto.randomUUID().split("-")[0];

// Read initial state from URL
const getInitialRoute = () => {
  const path = window.location.pathname;
  const match = path.match(/^\/world\/([a-f0-9-]+)$/i);
  return match ? match[1] : null;
};

const initialWorldId = getInitialRoute();

export const worldStore = proxy({
  worlds: loadFromStorage(),
  currentWorldId: initialWorldId,
  page: initialWorldId ? "editor" : "home",
});

subscribe(worldStore, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worldStore.worlds));
});

export const createWorld = (name, { description = "", thumbnail = null } = {}) => {
  const world = {
    id: shortId(),
    name,
    description,
    thumbnail,
    createdAt: Date.now(),
    objects: [],
    background: { type: "sky", preset: "sunset" },
    audioUrl: null,
  };
  worldStore.worlds.push(world);
  return world.id;
};

export const updateWorld = (id, data) => {
  const world = worldStore.worlds.find((w) => w.id === id);
  if (world) Object.assign(world, data);
};

export const deleteWorld = (id) => {
  const idx = worldStore.worlds.findIndex((w) => w.id === id);
  if (idx !== -1) worldStore.worlds.splice(idx, 1);
  if (worldStore.currentWorldId === id) {
    worldStore.currentWorldId = null;
    worldStore.page = "home";
    window.history.pushState(null, "", "/");
  }
};

export const openWorld = (id) => {
  worldStore.currentWorldId = id;
  worldStore.page = "editor";
  window.history.pushState(null, "", `/world/${id}`);
};

export const closeWorld = () => {
  worldStore.currentWorldId = null;
  worldStore.page = "home";
  window.history.pushState(null, "", "/");
};

export const getCurrentWorld = () => {
  return worldStore.worlds.find((w) => w.id === worldStore.currentWorldId) || null;
};

export const saveCurrentWorld = (data) => {
  const world = getCurrentWorld();
  if (world) {
    Object.assign(world, data);
  }
};

// Handle browser back/forward
window.addEventListener("popstate", () => {
  const id = getInitialRoute();
  if (id && worldStore.worlds.some((w) => w.id === id)) {
    worldStore.currentWorldId = id;
    worldStore.page = "editor";
  } else {
    worldStore.currentWorldId = null;
    worldStore.page = "home";
  }
});
