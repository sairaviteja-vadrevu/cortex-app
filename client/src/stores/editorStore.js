import { proxy } from "valtio";

const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
  "#a29bfe",
  "#fd79a8",
  "#6c5ce7",
  "#00b894",
  "#e17055",
  "#0984e3",
  "#00cec9",
  "#fdcb6e",
];

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const editorStore = proxy({
  objects: [],
  selectedId: null,
  transformMode: "translate",
  isPlaying: false,
  showAIPanel: false,
  showAudioPanel: false,
  background: { type: "sky", preset: "sunset" },
  audioUrl: null,
  audioVolume: 0.5,
});

export const addObject = (type, props = {}) => {
  const id = crypto.randomUUID();
  const names = {
    box: "Cube",
    sphere: "Sphere",
    cylinder: "Cylinder",
    cone: "Cone",
    torus: "Torus",
    character: "Character",
    plane: "Plane",
  };

  const obj = {
    id,
    type,
    name: `${names[type] || "Object"} ${editorStore.objects.length + 1}`,
    position: [0, type === "plane" ? 0.01 : type === "character" ? 0 : 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: props.color || getRandomColor(),
    metalness: 0.1,
    roughness: 0.5,
    animation: "none",
    physics: type !== "plane",
    textureUrl: null,
    ...props,
  };

  editorStore.objects.push(obj);
  editorStore.selectedId = id;
  return id;
};

export const removeObject = (id) => {
  const idx = editorStore.objects.findIndex((o) => o.id === id);
  if (idx !== -1) {
    editorStore.objects.splice(idx, 1);
    if (editorStore.selectedId === id) editorStore.selectedId = null;
  }
};

export const updateObject = (id, props) => {
  const obj = editorStore.objects.find((o) => o.id === id);
  if (obj) Object.assign(obj, props);
};

export const duplicateObject = (id) => {
  const obj = editorStore.objects.find((o) => o.id === id);
  if (!obj) return;
  const newObj = {
    ...JSON.parse(JSON.stringify(obj)),
    id: crypto.randomUUID(),
    name: `${obj.name} Copy`,
    position: [obj.position[0] + 1, obj.position[1], obj.position[2]],
  };
  editorStore.objects.push(newObj);
  editorStore.selectedId = newObj.id;
};

export const selectObject = (id) => {
  editorStore.selectedId = id;
};

export const clearSelection = () => {
  editorStore.selectedId = null;
};

export const loadWorldIntoEditor = (world) => {
  editorStore.objects = world.objects ? JSON.parse(JSON.stringify(world.objects)) : [];
  editorStore.background = world.background || { type: "sky", preset: "sunset" };
  editorStore.audioUrl = world.audioUrl || null;
  editorStore.selectedId = null;
  editorStore.isPlaying = false;
  editorStore.showAIPanel = false;
  editorStore.showAudioPanel = false;
  editorStore.transformMode = "translate";
};

export const getEditorData = () => ({
  objects: JSON.parse(JSON.stringify(editorStore.objects)),
  background: JSON.parse(JSON.stringify(editorStore.background)),
  audioUrl: editorStore.audioUrl,
});
