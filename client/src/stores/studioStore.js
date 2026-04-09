import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "g5-studio";
const shortId = () => crypto.randomUUID().split("-")[0];

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const studioStore = proxy({
  generations: loadFromStorage(),
  settings: {
    model: "fal-ai/nano-banana-2",
    imageSize: "landscape_16_9",
  },
});

subscribe(studioStore, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(studioStore.generations));
});

export const addGeneration = (data) => {
  const gen = {
    id: shortId(),
    prompt: "",
    imageSize: studioStore.settings.imageSize,
    imageUrl: null,
    status: "generating",
    createdAt: Date.now(),
    ...data,
  };
  studioStore.generations.unshift(gen);
  return gen.id;
};

export const updateGeneration = (id, data) => {
  const gen = studioStore.generations.find((g) => g.id === id);
  if (gen) Object.assign(gen, data);
};

export const deleteGeneration = (id) => {
  const idx = studioStore.generations.findIndex((g) => g.id === id);
  if (idx !== -1) studioStore.generations.splice(idx, 1);
};
