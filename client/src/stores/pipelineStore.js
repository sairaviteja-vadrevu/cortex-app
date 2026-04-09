import { proxy } from "valtio";
import { IMAGE_MODELS, IMAGE_SIZES, RESOLUTIONS, VIDEO_MODELS } from "./pipelineConstants";

let _nodeId = 1;
let _edgeId = 1;
let _msgId = 1;

/* ─── Store ─── */
export const pipelineStore = proxy({
  nodes: [],
  edges: [],
  running: false,
  messages: [],
  isAgentTyping: false,
  pipelineTitle: null,
  // Questionnaire state
  questionnaire: null, // { questions: [{q, options, answer}], originalText, refImage, refImages, intent, pending }
});

/* ─── Chat message helper ─── */
export function pushMsg(role, text, extra = {}) {
  pipelineStore.messages.push({ id: `msg_${_msgId++}`, role, text, timestamp: Date.now(), ...extra });
}

/* ─── Node / Edge CRUD ─── */
export const NODE_W = 280;
export const NODE_H_MAP = { prompt: 100, imageInput: 180, process: 290, videoProcess: 220, videoMerge: 220, videoAudioMerge: 220, output: 260 };
export const COL_GAP = 320;
export const ROW_GAP = 40;
export const PAD_X = 50;
export const PAD_Y = 50;

export function gridPos(col, row, nodeType) {
  const h = NODE_H_MAP[nodeType] || 200;
  return { x: PAD_X + col * COL_GAP, y: PAD_Y + row * (h + ROW_GAP) };
}

export function addNode(nodeType, col, row, config = {}) {
  const id = `node_${_nodeId++}`;
  const pos = gridPos(col, row, nodeType);
  const h = NODE_H_MAP[nodeType] || 200;

  const defaults = {
    prompt: { prompt: "", ...config },
    imageInput: { imageUrl: "", ...config },
    process: {
      prompt: "", model: IMAGE_MODELS[0].id, modelLabel: IMAGE_MODELS[0].label,
      ratio: IMAGE_SIZES[0].id, resolution: RESOLUTIONS[1].id,
      negativePrompt: "", seed: "", numImages: 1, outputFormat: "png",
      enablePromptExpansion: true,
      status: "idle", outputUrl: "", error: "", ...config,
    },
    videoProcess: {
      prompt: "", model: VIDEO_MODELS[0].id, modelLabel: VIDEO_MODELS[0].label,
      duration: "5", status: "idle", outputUrl: "", error: "", ...config,
    },
    videoMerge: {
      video1Url: "", video2Url: "",
      status: "idle", outputUrl: "", error: "", ...config,
    },
    videoAudioMerge: {
      videoUrl: "", audioUrl: "",
      status: "idle", outputUrl: "", error: "", ...config,
    },
    output: { type: "image", url: "", status: "waiting", label: config.label || "Result", ...config },
  };

  pipelineStore.nodes.push({
    id, nodeType, x: pos.x, y: pos.y, w: NODE_W, h,
    data: defaults[nodeType] || {},
  });
  return id;
}

export function addEdge(fromId, toId) {
  if (pipelineStore.edges.find((e) => e.from === fromId && e.to === toId)) return;
  pipelineStore.edges.push({ id: `edge_${_edgeId++}`, from: fromId, to: toId });
}

export function updateNodeData(id, patch) {
  const node = pipelineStore.nodes.find((n) => n.id === id);
  if (node) Object.assign(node.data, patch);
}

export function moveNode(id, x, y) {
  const node = pipelineStore.nodes.find((n) => n.id === id);
  if (node) { node.x = x; node.y = y; }
}

export function removeNode(id) {
  pipelineStore.edges = pipelineStore.edges.filter((e) => e.from !== id && e.to !== id);
  pipelineStore.nodes = pipelineStore.nodes.filter((n) => n.id !== id);
}

export function clearPipeline() {
  pipelineStore.nodes = [];
  pipelineStore.edges = [];
  pipelineStore.running = false;
  pipelineStore.pipelineTitle = null;
}

/* ─── Chain a new node from an output node ─── */
export function chainFromOutput(outputNodeId, chainType) {
  const outputNode = pipelineStore.nodes.find((n) => n.id === outputNodeId);
  if (!outputNode || !outputNode.data.url) return;

  const imageUrl = outputNode.data.url;

  // Find the column/row position to place the new chain
  let maxCol = 0;
  pipelineStore.nodes.forEach((n) => {
    const col = Math.round((n.x - PAD_X) / COL_GAP);
    if (col > maxCol) maxCol = col;
  });
  const newCol = maxCol + 1;

  if (chainType === "edit") {
    const img = addNode("imageInput", newCol, 0, { imageUrl });
    const prompt = addNode("prompt", newCol, 1);
    const proc = addNode("process", newCol + 1, 0);
    const out = addNode("output", newCol + 2, 0, { label: "Edited Image" });
    addEdge(img, proc);
    addEdge(prompt, proc);
    addEdge(proc, out);
  } else if (chainType === "video") {
    const img = addNode("imageInput", newCol, 0, { imageUrl });
    const prompt = addNode("prompt", newCol, 1);
    const proc = addNode("videoProcess", newCol + 1, 0, { referenceImageUrl: imageUrl });
    const out = addNode("output", newCol + 2, 0, { label: "Generated Video", type: "video" });
    addEdge(img, proc);
    addEdge(prompt, proc);
    addEdge(proc, out);
  } else if (chainType === "reference") {
    const img = addNode("imageInput", newCol, 0, { imageUrl });
    const prompt = addNode("prompt", newCol, 1);
    const proc = addNode("process", newCol + 1, 0);
    const out = addNode("output", newCol + 2, 0, { label: "New Image" });
    addEdge(img, proc);
    addEdge(prompt, proc);
    addEdge(proc, out);
  } else if (chainType === "merge") {
    const merge = addNode("videoMerge", newCol, 0, { video1Url: imageUrl });
    const out = addNode("output", newCol + 1, 0, { label: "Merged Video", type: "video" });
    addEdge(merge, out);
  } else if (chainType === "addAudio") {
    const merge = addNode("videoAudioMerge", newCol, 0, { videoUrl: imageUrl });
    const out = addNode("output", newCol + 1, 0, { label: "Video with Audio", type: "video" });
    addEdge(merge, out);
  }
}

/* ─── Re-exports from sub-modules ─── */
export * from "./pipelineConstants";
export * from "./pipelineExecution";
export * from "./pipelineChat";
