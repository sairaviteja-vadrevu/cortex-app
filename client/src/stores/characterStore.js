import { proxy, subscribe } from "valtio";
import { authStore } from "./authStore";

const shortId = () => crypto.randomUUID().split("-")[0];

function getStorageKey() {
  const userId = authStore.user?.id;
  return userId ? `g5-characters-${userId}` : null;
}

function loadFromStorage() {
  try {
    const key = getStorageKey();
    if (!key) return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export const characterStore = proxy({
  characters: loadFromStorage(),
});

subscribe(characterStore, () => {
  const key = getStorageKey();
  if (key) {
    localStorage.setItem(key, JSON.stringify(characterStore.characters));
  }
});

// Reload characters when user changes
export const reloadCharacters = () => {
  characterStore.characters = loadFromStorage();
};

export const addCharacter = (data) => {
  const char = {
    id: shortId(),
    name: "",
    description: "",
    imageUrl: null,
    modelUrl: null,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usedIn: { movies: [], worlds: [] },
    ...data,
  };
  characterStore.characters.unshift(char);
  return char.id;
};

export const updateCharacter = (id, data) => {
  const char = characterStore.characters.find((c) => c.id === id);
  if (char) Object.assign(char, data, { updatedAt: Date.now() });
};

export const deleteCharacter = (id) => {
  const idx = characterStore.characters.findIndex((c) => c.id === id);
  if (idx !== -1) characterStore.characters.splice(idx, 1);
};

export const getCharacter = (id) =>
  characterStore.characters.find((c) => c.id === id) || null;

// Reload on auth change
import { onAuthChange } from "./authStore";
onAuthChange(reloadCharacters);
