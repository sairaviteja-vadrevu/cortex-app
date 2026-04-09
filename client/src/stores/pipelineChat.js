import { apiFetch } from "../utils/api";
import { IMAGE_MODELS } from "./pipelineConstants";
import {
  pipelineStore,
  pushMsg,
  addNode,
  addEdge,
  clearPipeline,
} from "./pipelineStore";
import { runProcessNode, reRunPipeline, modifyPipeline } from "./pipelineExecution";

/* ─── Build default pipelines ─── */
export function buildDefaultImagePipeline() {
  clearPipeline();
  pipelineStore.pipelineTitle = "Image Generation Pipeline";
  const p = addNode("prompt", 0, 0);
  const proc = addNode("process", 1, 0);
  const out = addNode("output", 2, 0, { label: "Generated Image" });
  addEdge(p, proc);
  addEdge(proc, out);
}

export function buildDefaultVideoPipeline() {
  clearPipeline();
  pipelineStore.pipelineTitle = "Video Generation Pipeline";
  const p = addNode("prompt", 0, 0);
  const proc = addNode("videoProcess", 1, 0);
  const out = addNode("output", 2, 0, { label: "Generated Video", type: "video" });
  addEdge(p, proc);
  addEdge(proc, out);
}

export function buildImageToVideoPipeline() {
  clearPipeline();
  pipelineStore.pipelineTitle = "Image + Video Pipeline";
  const p = addNode("prompt", 0, 0);
  const imgProc = addNode("process", 1, 0);
  const imgOut = addNode("output", 2, 0, { label: "Generated Image" });
  const vidProc = addNode("videoProcess", 1, 1);
  const vidOut = addNode("output", 2, 1, { label: "Generated Video", type: "video" });
  addEdge(p, imgProc);
  addEdge(imgProc, imgOut);
  addEdge(p, vidProc);
  addEdge(vidProc, vidOut);
}

export function buildRefImageToVideoPipeline(imageUrl) {
  clearPipeline();
  pipelineStore.pipelineTitle = "Reference Image → Video Pipeline";
  const img = addNode("imageInput", 0, 0, { imageUrl });
  const prompt = addNode("prompt", 0, 1);
  const proc = addNode("videoProcess", 1, 0, { referenceImageUrl: imageUrl });
  const out = addNode("output", 2, 0, { label: "Generated Video", type: "video" });
  addEdge(img, proc);
  addEdge(prompt, proc);
  addEdge(proc, out);
}

export function buildRefImageProcessPipeline(imageUrl) {
  clearPipeline();
  pipelineStore.pipelineTitle = "Reference Image Pipeline";
  const img = addNode("imageInput", 0, 0, { imageUrl });
  const prompt = addNode("prompt", 0, 1);
  const proc = addNode("process", 1, 0);
  const out = addNode("output", 2, 0, { label: "Generated Image" });
  addEdge(img, proc);
  addEdge(prompt, proc);
  addEdge(proc, out);
}

/* ─── Build video merge pipeline ─── */
export function buildVideoMergePipeline(video1Url, video2Url) {
  if (video1Url && typeof video1Url !== "string") video1Url = "";
  if (video2Url && typeof video2Url !== "string") video2Url = "";
  clearPipeline();
  pipelineStore.pipelineTitle = "Video Merge Pipeline";
  const merge = addNode("videoMerge", 1, 0, { video1Url: video1Url || "", video2Url: video2Url || "" });
  const out = addNode("output", 2, 0, { label: "Merged Video", type: "video" });
  addEdge(merge, out);
}

/* ─── Build video + audio merge pipeline ─── */
export function buildVideoAudioMergePipeline() {
  clearPipeline();
  pipelineStore.pipelineTitle = "Video + Audio Merge Pipeline";
  const merge = addNode("videoAudioMerge", 1, 0);
  const out = addNode("output", 2, 0, { label: "Merged Output", type: "video" });
  addEdge(merge, out);
}

/* ─── Build product ad pipeline (ref image → styled shot → video) ─── */
export function buildProductAdPipeline(imageUrl) {
  clearPipeline();
  pipelineStore.pipelineTitle = "Product Ad Pipeline";
  // Step 1: Reference image input
  const img = addNode("imageInput", 0, 0, { imageUrl });
  // Step 2: Prompt for styling
  const prompt = addNode("prompt", 0, 1);
  // Step 3: Generate styled product shot
  const proc = addNode("process", 1, 0);
  const imgOut = addNode("output", 2, 0, { label: "Styled Product Shot" });
  addEdge(img, proc);
  addEdge(prompt, proc);
  addEdge(proc, imgOut);
  // Step 4: Animate to video
  const vidPrompt = addNode("prompt", 1, 1);
  const vidProc = addNode("videoProcess", 2, 1);
  const vidOut = addNode("output", 3, 1, { label: "Product Video Ad", type: "video" });
  addEdge(vidPrompt, vidProc);
  addEdge(vidProc, vidOut);
  return { imgOut, vidProc };
}

/* ─── Build style transfer pipeline ─── */
export function buildStyleTransferPipeline(styleImageUrl, contentImageUrl) {
  clearPipeline();
  pipelineStore.pipelineTitle = "Style Transfer Pipeline";
  const styleImg = addNode("imageInput", 0, 0, { imageUrl: styleImageUrl });
  const contentImg = addNode("imageInput", 0, 1, { imageUrl: contentImageUrl });
  const prompt = addNode("prompt", 0, 2);
  const proc = addNode("process", 1, 0);
  const out = addNode("output", 2, 0, { label: "Style Transferred" });
  addEdge(styleImg, proc);
  addEdge(contentImg, proc);
  addEdge(prompt, proc);
  addEdge(proc, out);
}

/* ─── Build product photoshoot pipeline ─── */
export function buildProductPhotoshootPipeline(imageUrl) {
  clearPipeline();
  pipelineStore.pipelineTitle = "Product Photoshoot Pipeline";
  const img = addNode("imageInput", 0, 0, { imageUrl });
  const prompt = addNode("prompt", 0, 1);
  const proc = addNode("process", 1, 0);
  const out = addNode("output", 2, 0, { label: "Product Shot" });
  addEdge(img, proc);
  addEdge(prompt, proc);
  addEdge(proc, out);
}

/* ─── Chat helpers ─── */
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseIntent(msg) {
  const m = msg.toLowerCase();
  if (m.match(/\bre-?run\b/)) return "rerun";
  if (m.match(/\bmodify\b/)) return "modify";
  if (m.match(/\b(add|merge|combine)\b.*\baudio\b/)) return "audio_merge";
  if (m.match(/\baudio\b.*\b(add|merge|combine)\b/)) return "audio_merge";
  if (m.match(/\b(merge|combine|join|concat|stitch)\b.*\b(video|clip)s?\b/)) return "merge";
  if (m.match(/\b(product\s+photoshoot|photoshoot)\b/)) return "photoshoot";
  if (m.match(/\b(style\s+transfer|apply.*style)\b/)) return "style_transfer";
  if (m.match(/\b(video\s*ad|product.*video|ad\s+for|reel|commercial|promo)\b/)) return "product_video";
  if (m.match(/\b(background\s*swap|change\s*background|replace\s*background)\b/)) return "bg_swap";
  if (m.match(/\b(video|clip|animate|motion|kling)\b/)) return "video";
  if (m.match(/\b(image|picture|photo|generate|create|draw|render)\b/)) return "image";
  if (m.match(/\b(both|image.*video|video.*image)\b/)) return "both";
  return "image";
}

function extractSubject(msg) {
  const m = msg.toLowerCase();
  let s = "";
  const match = m.match(/(?:of|about|showing|depicting|featuring)\s+(?:a\s+|an\s+)?(.+?)(?:\s+using|\s+with\s+\w+\s+model|$)/);
  if (match) s = match[1].trim();
  if (!s) {
    const alt = m.match(/(?:generate|create|make|build|draw|render)\s+(?:a\s+|an\s+)?(?:image|picture|video|clip)?\s*(?:of|about)?\s*(.+?)(?:\s+using|\s+with|$)/);
    if (alt) s = alt[1].trim();
  }
  return s || msg;
}

function detectModel(msg) {
  const m = msg.toLowerCase();
  if (m.includes("wan")) return IMAGE_MODELS.find((x) => x.id.includes("wan-video")) || IMAGE_MODELS[0];
  for (const mdl of IMAGE_MODELS) {
    if (m.includes(mdl.label.toLowerCase())) return mdl;
  }
  return IMAGE_MODELS[0];
}

/* ─── Gemini questionnaire ─── */
async function generateQuestions(userPrompt, intent) {
  try {
    const res = await apiFetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt, intent }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Question generation failed:", err);
    return null;
  }
}

async function buildPromptFromAnswers(userPrompt, questions, intent) {
  try {
    const res = await apiFetch("/api/build-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt, questions }),
    });
    if (!res.ok) return userPrompt;
    const data = await res.json();
    return data.prompt || userPrompt;
  } catch (err) {
    console.error("Prompt build failed:", err);
    return userPrompt;
  }
}

export function answerQuestion(questionIndex, answer) {
  if (!pipelineStore.questionnaire) return;
  pipelineStore.questionnaire.questions[questionIndex].answer = answer;
}

export async function submitQuestionnaire() {
  const q = pipelineStore.questionnaire;
  if (!q) return;

  // Check if all questions answered
  const unanswered = q.questions.filter((x) => !x.answer);
  if (unanswered.length > 0) return;

  pipelineStore.isAgentTyping = true;
  pushMsg("system", "Building optimized prompt from your preferences...", { nodeEvent: true });

  const enhancedPrompt = await buildPromptFromAnswers(q.originalText, q.questions, q.intent);

  pushMsg("agent", `Enhanced prompt: *"${enhancedPrompt}"*`);
  pipelineStore.questionnaire = null;

  // Now execute with enhanced prompt
  await delay(400);
  await executePipeline(enhancedPrompt, q.intent, q.refImage, q.refImages);
}

export async function skipQuestionnaire() {
  const q = pipelineStore.questionnaire;
  if (!q) return;
  pipelineStore.questionnaire = null;
  pushMsg("system", "Skipping questions — using automatic prompt enhancement.", { nodeEvent: true });
  await executePipeline(q.originalText, q.intent, q.refImage, q.refImages);
}

async function executePipeline(subject, intent, refImage, refImages) {
  const hasRef = !!refImage;
  const hasMultiRef = refImages && refImages.length > 1;
  const model = detectModel(subject);

  // Build pipeline based on intent
  if (intent === "audio_merge") {
    buildVideoAudioMergePipeline();
  } else if (intent === "merge") {
    buildVideoMergePipeline();
  } else if (intent === "product_video") {
    if (hasRef) { buildProductAdPipeline(refImage.url); }
    else { buildImageToVideoPipeline(); }
  } else if (intent === "photoshoot") {
    if (hasRef) { buildProductPhotoshootPipeline(refImage.url); }
    else { buildDefaultImagePipeline(); }
  } else if (intent === "style_transfer" && hasMultiRef) {
    buildStyleTransferPipeline(refImages[0].url, refImages[1].url);
  } else if (intent === "bg_swap" && hasRef) {
    buildRefImageProcessPipeline(refImage.url);
  } else if (hasRef && intent === "video") {
    buildRefImageToVideoPipeline(refImage.url, refImage.name);
  } else if (hasRef) {
    buildRefImageProcessPipeline(refImage.url, refImage.name);
  } else if (intent === "video") {
    buildDefaultVideoPipeline();
  } else if (intent === "both") {
    buildImageToVideoPipeline();
  } else {
    buildDefaultImagePipeline();
  }

  // Pre-fill prompts
  const promptNodes = pipelineStore.nodes.filter((n) => n.nodeType === "prompt");
  promptNodes.forEach((n) => { n.data.prompt = subject; });

  const processNodes = pipelineStore.nodes.filter((n) => n.nodeType === "process" || n.nodeType === "videoProcess");
  processNodes.forEach((n) => {
    n.data.prompt = subject;
    if (n.nodeType === "process") {
      n.data.model = model.id;
      n.data.modelLabel = model.label;
    }
    if (hasRef && n.nodeType === "videoProcess") {
      n.data.referenceImageUrl = refImage.url;
    }
  });

  if (intent === "product_video" && promptNodes.length >= 2) {
    promptNodes[0].data.prompt = subject;
    promptNodes[1].data.prompt = `Smooth camera movement, subtle lighting shifts, premium commercial feel. ${subject}`;
    processNodes.forEach((n) => {
      if (n.nodeType === "process") n.data.prompt = promptNodes[0].data.prompt;
      if (n.nodeType === "videoProcess") n.data.prompt = promptNodes[1].data.prompt;
    });
  }

  pushMsg("agent", `Pipeline built. Running now...`);
  await delay(300);

  // Run all executable nodes (process, videoProcess, videoMerge, videoAudioMerge)
  const allRunnable = pipelineStore.nodes.filter((n) => n.nodeType === "process" || n.nodeType === "videoProcess" || n.nodeType === "videoMerge" || n.nodeType === "videoAudioMerge");
  pipelineStore.running = true;
  for (const node of allRunnable) {
    const label = node.nodeType === "process" ? "Image" : node.nodeType === "videoMerge" ? "Video Merge" : node.nodeType === "videoAudioMerge" ? "Audio Merge" : "Video";
    pushMsg("system", `Running **${label} Generation**...`, { nodeEvent: true });
    await runProcessNode(node.id);
    if (node.data.status === "done") {
      pushMsg("system", `${label} generation complete.`);
    } else if (node.data.status === "error") {
      pushMsg("system", `Error: ${node.data.error}`, { nodeEvent: true });
    }
  }
  pipelineStore.running = false;
  pushMsg("agent", `Pipeline finished. Check the output nodes on the canvas.\n\nWant me to **re-run**, **modify**, or **build a new pipeline**?`);
  pipelineStore.isAgentTyping = false;
}

export async function sendMessage(text, refImage = null, refImages = null) {
  if (!text.trim() || pipelineStore.isAgentTyping || pipelineStore.running) return;

  const displayText = refImage ? `${text}` : text;
  const extra = {};
  if (refImage) extra.refImage = refImage;
  if (refImages && refImages.length > 0) extra.refImages = refImages;
  pushMsg("user", displayText, extra);
  pipelineStore.isAgentTyping = true;
  await delay(400);

  const intent = parseIntent(text);

  // Handle re-run
  if (intent === "rerun") {
    if (pipelineStore.nodes.length === 0) {
      pushMsg("agent", "No pipeline to re-run. Describe what you'd like to generate.");
      pipelineStore.isAgentTyping = false;
      return;
    }
    pushMsg("agent", "Re-running the existing pipeline with the same settings...", { thinking: true });
    pipelineStore.isAgentTyping = false;
    await reRunPipeline();
    return;
  }

  // Handle modify
  if (intent === "modify") {
    if (pipelineStore.nodes.length === 0) {
      pushMsg("agent", "No pipeline to modify. Describe what you'd like to generate.");
      pipelineStore.isAgentTyping = false;
      return;
    }
    const newSubject = extractSubject(text.replace(/\bmodify\b/i, "").trim());
    pushMsg("agent", `Modifying pipeline with new prompt: "${newSubject}"`, { thinking: true });
    pipelineStore.isAgentTyping = false;
    await modifyPipeline(newSubject);
    return;
  }

  const subject = extractSubject(text);
  const model = detectModel(text);
  const hasRef = !!refImage;
  const hasMultiRef = refImages && refImages.length > 1;

  let thinkingMsg;
  if (intent === "audio_merge") {
    thinkingMsg = `I'll set up a video + audio merge pipeline — paste your video and audio URLs and I'll combine them.`;
  } else if (intent === "merge") {
    thinkingMsg = `I'll set up a video merge pipeline — paste two video URLs and I'll combine them into one.`;
  } else if (intent === "product_video" && hasRef) {
    thinkingMsg = `I'll create a product video ad — first generating a styled product shot from "${refImage.name}", then animating it into a short video clip.`;
  } else if (intent === "product_video") {
    thinkingMsg = `I'll build a product video ad pipeline — generating a styled product image from "${subject}", then animating it with Kling.`;
  } else if (intent === "photoshoot" && hasRef) {
    thinkingMsg = `I'll create a product photoshoot using "${refImage.name}" — generating a professional studio shot with cinematic lighting.`;
  } else if (intent === "photoshoot") {
    thinkingMsg = `I'll set up a product photoshoot pipeline for "${subject}".`;
  } else if (intent === "style_transfer" && hasMultiRef) {
    thinkingMsg = `I'll apply the style from one image to the other — setting up a style transfer pipeline.`;
  } else if (intent === "style_transfer" && hasRef) {
    thinkingMsg = `I'll extract the style from "${refImage.name}" and apply it to generate "${subject}".`;
  } else if (intent === "bg_swap" && hasRef) {
    thinkingMsg = `I'll swap the background on "${refImage.name}" — "${subject}".`;
  } else if (hasRef && intent === "video") {
    thinkingMsg = `I'll use "${refImage.name}" as reference and generate a video — sending it directly to Kling for animation.`;
  } else if (hasRef) {
    thinkingMsg = `I'll use "${refImage.name}" as a reference and generate a new image using ${model.label} — "${subject}".`;
  } else if (intent === "video") {
    thinkingMsg = `I'll generate a video of "${subject}" — creating a base frame with Flux, then animating with Kling.`;
  } else if (intent === "both") {
    thinkingMsg = `I'll generate both an image and a video of "${subject}".`;
  } else {
    thinkingMsg = `I'll generate an image of "${subject}" using ${model.label}.`;
  }

  pushMsg("agent", thinkingMsg, { thinking: true });
  await delay(800);

  // Try to generate clarifying questions via Gemini
  const questions = await generateQuestions(subject, intent);

  if (questions && questions.length > 0) {
    // Show questionnaire
    pipelineStore.questionnaire = {
      questions: questions.map((q) => ({ ...q, answer: null })),
      originalText: subject,
      refImage,
      refImages,
      intent,
    };
    pushMsg("agent", "I have a few questions to help craft the perfect result. Answer below, or click **Skip** to auto-generate.");
    pipelineStore.isAgentTyping = false;
  } else {
    // No questions — execute directly
    pipelineStore.isAgentTyping = false;
    await executePipeline(subject, intent, refImage, refImages);
  }
}

export function clearChat() {
  pipelineStore.messages = [];
  clearPipeline();
}
