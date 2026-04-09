import { replicate } from "../utils/replicate";
import { proxy } from "valtio";
import { addObject, updateObject, editorStore } from "./editorStore";

let _msgId = 1;

export const worldAgentStore = proxy({
  messages: [],
  isTyping: false,
  generatingAssets: [], // tracks in-progress asset generations
});

function pushMsg(role, text, extra = {}) {
  worldAgentStore.messages.push({
    id: `wam_${_msgId++}`,
    role,
    text,
    timestamp: Date.now(),
    ...extra,
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


/* ─── Intent parsing ─── */
function parseIntent(msg) {
  const m = msg.toLowerCase();
  if (m.match(/\b(background|environment|sky|skybox|scene|panoram)/)) return "background";
  if (m.match(/\b(texture|material|surface|skin)\b/)) return "texture";
  if (m.match(/\b(3d\s*model|character|mesh|glb|gltf|sculpture|statue|figurine|generate\s*a?\s*model)\b/)) return "3d-model";
  if (m.match(/\b(add|place|create|spawn|insert|put)\b.*\b(cube|box|sphere|ball|cylinder|cone|torus|donut|plane|floor|ground)\b/)) return "primitive";
  if (m.match(/\b(remove|delete|clear)\b/)) return "remove";
  if (m.match(/\b(color|colour|paint)\b/)) return "color";
  if (m.match(/\b(animate|animation|spin|rotate|bounce|float|pulse)\b/)) return "animate";
  if (m.match(/\b(music|audio|sound|ambient)\b/)) return "audio";
  return "general";
}

function extractPrimitive(msg) {
  const m = msg.toLowerCase();
  if (m.match(/\b(cube|box)\b/)) return "box";
  if (m.match(/\b(sphere|ball|orb)\b/)) return "sphere";
  if (m.match(/\b(cylinder|pillar|column)\b/)) return "cylinder";
  if (m.match(/\b(cone|pyramid)\b/)) return "cone";
  if (m.match(/\b(torus|donut|ring)\b/)) return "torus";
  if (m.match(/\b(plane|floor|ground)\b/)) return "plane";
  return null;
}

function extractColor(msg) {
  const hexMatch = msg.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) return hexMatch[0];
  const colors = {
    red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
    purple: "#a855f7", pink: "#ec4899", orange: "#f97316", white: "#ffffff",
    black: "#000000", cyan: "#06b6d4", indigo: "#6366f1", teal: "#14b8a6",
    gold: "#fbbf24", silver: "#94a3b8", brown: "#92400e",
  };
  for (const [name, hex] of Object.entries(colors)) {
    if (msg.toLowerCase().includes(name)) return hex;
  }
  return null;
}

function extractAnimation(msg) {
  const m = msg.toLowerCase();
  if (m.includes("spin") || m.includes("rotate")) return "rotate";
  if (m.includes("bounce")) return "bounce";
  if (m.includes("float") || m.includes("hover")) return "float";
  if (m.includes("pulse")) return "pulse";
  if (m.includes("sway")) return "sway";
  return "rotate";
}

/* ─── Handlers ─── */

async function handleBackground(prompt) {
  const assetId = addGeneratingAsset("Background Image");
  try {
    const output = await replicate("google/nano-banana", {
      prompt: `panoramic landscape environment, ${prompt}, highly detailed, 8k, cinematic lighting`,
      num_outputs: 1, aspect_ratio: "16:9", output_format: "png",
    });
    const url = Array.isArray(output) ? output[0] : output;
    editorStore.background = { type: "image", url };
    completeGeneratingAsset(assetId, url);
    pushMsg("agent", `Background set! I generated an environment based on your description.`, { imageUrl: url });
  } catch (err) {
    failGeneratingAsset(assetId, err.message);
    pushMsg("agent", `Failed to generate background: ${err.message}`);
  }
}

async function handleTexture(prompt) {
  if (!editorStore.selectedId) {
    pushMsg("agent", "Please select an object first so I can apply a texture to it.");
    return;
  }
  const assetId = addGeneratingAsset("Texture");
  try {
    const output = await replicate("google/nano-banana", {
      prompt: `seamless tileable texture, ${prompt}, highly detailed, photorealistic`,
      num_outputs: 1, aspect_ratio: "1:1", output_format: "png",
    });
    const url = Array.isArray(output) ? output[0] : output;
    const obj = editorStore.objects.find((o) => o.id === editorStore.selectedId);
    if (obj) obj.textureUrl = url;
    completeGeneratingAsset(assetId, url);
    pushMsg("agent", `Texture applied to ${obj?.name || "selected object"}.`, { imageUrl: url });
  } catch (err) {
    failGeneratingAsset(assetId, err.message);
    pushMsg("agent", `Failed to generate texture: ${err.message}`);
  }
}

async function handle3DModel(prompt) {
  // Step 1: Generate reference image
  const imgAssetId = addGeneratingAsset("Reference Image");
  pushMsg("system", "Generating reference image for 3D model...", { step: true });

  let imageUrl;
  try {
    const imgOutput = await replicate("google/nano-banana", {
      prompt: `${prompt}, 3D character concept, full body, clean background, studio lighting, high detail`,
      num_outputs: 1, aspect_ratio: "1:1", output_format: "png",
    });
    imageUrl = Array.isArray(imgOutput) ? imgOutput[0] : imgOutput;
    completeGeneratingAsset(imgAssetId, imageUrl);
    pushMsg("system", "Reference image ready. Generating 3D model...", { step: true, imageUrl });
  } catch (err) {
    failGeneratingAsset(imgAssetId, err.message);
    pushMsg("agent", `Failed to generate reference image: ${err.message}`);
    return;
  }

  // Step 2: Generate 3D model from image
  const modelAssetId = addGeneratingAsset("3D Model");
  try {
    const modelOutput = await replicate("cjwbw/triposr", { image: imageUrl, output_format: "glb" });
    const modelUrl = Array.isArray(modelOutput) ? modelOutput[0] : modelOutput;
    if (modelUrl) {
      addObject("character", { name: prompt.slice(0, 30), modelUrl, position: [0, 0, 0], scale: [1, 1, 1] });
      completeGeneratingAsset(modelAssetId, modelUrl);
      pushMsg("agent", `3D model created and added to scene! You can move, scale, and rotate it using the transform controls.`, { modelUrl });
    } else {
      throw new Error("No model returned");
    }
  } catch (err) {
    failGeneratingAsset(modelAssetId, err.message);
    pushMsg("agent", `Failed to generate 3D model: ${err.message}`);
  }
}

function handlePrimitive(msg) {
  const type = extractPrimitive(msg);
  if (!type) {
    pushMsg("agent", "I couldn't determine which shape to add. Try: cube, sphere, cylinder, cone, torus, or plane.");
    return;
  }
  const color = extractColor(msg);
  const props = {};
  if (color) props.color = color;
  addObject(type, props);
  pushMsg("agent", `Added a **${type}**${color ? ` (${color})` : ""} to the scene. It's now selected — you can move it with the transform controls.`);
}

function handleColor(msg) {
  const color = extractColor(msg);
  if (!color) {
    pushMsg("agent", "I couldn't find a color in your message. Try a color name (red, blue, etc.) or a hex code (#ff0000).");
    return;
  }
  if (!editorStore.selectedId) {
    pushMsg("agent", `Select an object first, then I can change its color to ${color}.`);
    return;
  }
  const obj = editorStore.objects.find((o) => o.id === editorStore.selectedId);
  if (obj) {
    obj.color = color;
    pushMsg("agent", `Changed **${obj.name}**'s color to **${color}**.`);
  }
}

function handleAnimate(msg) {
  const anim = extractAnimation(msg);
  if (!editorStore.selectedId) {
    pushMsg("agent", "Select an object first so I can animate it.");
    return;
  }
  const obj = editorStore.objects.find((o) => o.id === editorStore.selectedId);
  if (obj) {
    obj.animation = anim;
    pushMsg("agent", `Applied **${anim}** animation to **${obj.name}**.`);
  }
}

function handleRemove(msg) {
  const m = msg.toLowerCase();
  if (m.includes("all") || m.includes("everything") || m.includes("clear")) {
    const count = editorStore.objects.length;
    editorStore.objects.splice(0, editorStore.objects.length);
    editorStore.selectedId = null;
    pushMsg("agent", `Cleared all ${count} objects from the scene.`);
    return;
  }
  if (!editorStore.selectedId) {
    pushMsg("agent", "Select an object first so I can remove it, or say \"clear all\" to remove everything.");
    return;
  }
  const obj = editorStore.objects.find((o) => o.id === editorStore.selectedId);
  const name = obj?.name || "selected object";
  const idx = editorStore.objects.findIndex((o) => o.id === editorStore.selectedId);
  if (idx !== -1) editorStore.objects.splice(idx, 1);
  editorStore.selectedId = null;
  pushMsg("agent", `Removed **${name}** from the scene.`);
}

async function handleAudio(prompt) {
  const assetId = addGeneratingAsset("Audio");
  pushMsg("system", "Generating ambient audio...", { step: true });

  try {
    const audioOutput = await replicate("meta/musicgen", {
      prompt: `ambient ${prompt}, atmospheric, background music`,
      duration: 30, output_format: "mp3",
    });
    const audioUrl = Array.isArray(audioOutput) ? audioOutput[0] : audioOutput;
    if (audioUrl) {
      editorStore.audioUrl = audioUrl;
      completeGeneratingAsset(assetId, audioUrl);
      pushMsg("agent", "Ambient audio generated and set as background music!");
    }
  } catch (err) {
    failGeneratingAsset(assetId, err.message);
    pushMsg("agent", `Audio generation failed: ${err.message}`);
  }
}

function handleGeneral(msg) {
  pushMsg("agent", `I can help you build this world! Here's what I can do:

- **"Add a red sphere"** — place primitives (cube, sphere, cylinder, cone, torus, plane)
- **"Generate a forest background"** — create AI backgrounds
- **"Apply wood texture"** — apply AI textures to selected objects
- **"Generate a 3D model of a warrior"** — create 3D models from text
- **"Make it spin"** — animate selected objects
- **"Paint it blue"** — change object colors
- **"Remove it"** or **"Clear all"** — delete objects
- **"Add ambient rain sounds"** — generate background audio

What would you like to create?`);
}

/* ─── Asset tracking ─── */
let _assetId = 1;

function addGeneratingAsset(label) {
  const id = `ga_${_assetId++}`;
  worldAgentStore.generatingAssets.push({
    id,
    label,
    status: "generating",
    progress: "",
    url: null,
  });
  return id;
}

function updateGeneratingAsset(id, progress) {
  const a = worldAgentStore.generatingAssets.find((x) => x.id === id);
  if (a) a.progress = progress;
}

function completeGeneratingAsset(id, url) {
  const a = worldAgentStore.generatingAssets.find((x) => x.id === id);
  if (a) {
    a.status = "done";
    a.url = url;
  }
}

function failGeneratingAsset(id, error) {
  const a = worldAgentStore.generatingAssets.find((x) => x.id === id);
  if (a) {
    a.status = "error";
    a.progress = error;
  }
}

/* ─── Main send ─── */
export async function sendAgentMessage(text) {
  if (!text.trim() || worldAgentStore.isTyping) return;

  pushMsg("user", text);
  worldAgentStore.isTyping = true;
  await delay(300);

  const intent = parseIntent(text);

  try {
    switch (intent) {
      case "background":
        pushMsg("agent", "Generating your environment...", { thinking: true });
        await handleBackground(text);
        break;
      case "texture":
        pushMsg("agent", "Generating texture...", { thinking: true });
        await handleTexture(text);
        break;
      case "3d-model":
        pushMsg("agent", "I'll generate a 3D model for you. This takes a couple of minutes.", { thinking: true });
        await handle3DModel(text);
        break;
      case "primitive":
        handlePrimitive(text);
        break;
      case "color":
        handleColor(text);
        break;
      case "animate":
        handleAnimate(text);
        break;
      case "remove":
        handleRemove(text);
        break;
      case "audio":
        pushMsg("agent", "Generating ambient audio...", { thinking: true });
        await handleAudio(text);
        break;
      default:
        handleGeneral(text);
    }
  } catch (err) {
    pushMsg("agent", `Something went wrong: ${err.message}`);
  }

  worldAgentStore.isTyping = false;
}

export function clearAgentChat() {
  worldAgentStore.messages = [];
  worldAgentStore.generatingAssets = [];
}
