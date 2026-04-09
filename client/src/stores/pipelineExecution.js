import { apiFetch } from "../utils/api";
import { IMAGE_MODELS, VIDEO_MODELS } from "./pipelineConstants";
import { pipelineStore, updateNodeData, pushMsg } from "./pipelineStore";

/* ─── Replicate helper (via Python backend) ─── */
export async function replicateRun(model, input) {
  // Create prediction via backend
  const createRes = await apiFetch(`/api/models/${model}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Prediction request failed: ${err}`);
  }

  let prediction = await createRes.json();

  // If "Prefer: wait" returned completed result, use it directly
  if (prediction.status === "succeeded") return prediction.output;
  if (prediction.status === "failed") throw new Error(prediction.error || "Replicate prediction failed");

  // Otherwise poll for completion via backend
  const predictionId = prediction.id;
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await apiFetch(`/api/predictions/${predictionId}`);
    if (!pollRes.ok) continue;
    prediction = await pollRes.json();
    if (prediction.status === "succeeded") return prediction.output;
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || "Replicate prediction failed");
    }
  }
  throw new Error("Replicate prediction timed out");
}

export async function toDataUrl(localUrl) {
  if (!localUrl) return localUrl;
  if (localUrl.startsWith("http://") || localUrl.startsWith("https://")) return localUrl;
  if (localUrl.startsWith("data:")) return localUrl;
  const response = await fetch(localUrl);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* ─── Aspect ratio helpers ─── */
export function getAspectRatio(ratio) {
  return ratio === "landscape_16_9" ? "16:9"
    : ratio === "portrait_4_3" ? "3:4"
    : ratio === "square_hd" ? "1:1"
    : ratio === "landscape_4_3" ? "4:3" : "16:9";
}

export function getHDSize(ratio) {
  const map = {
    "landscape_16_9": { width: 1344, height: 768 },
    "portrait_4_3": { width: 768, height: 1024 },
    "square_hd": { width: 1024, height: 1024 },
    "landscape_4_3": { width: 1024, height: 768 },
  };
  return map[ratio] || { width: 1344, height: 768 };
}

/* ─── Build Replicate input based on model ─── */
export function buildImageInput(modelId, prompt, ratio, opts = {}) {
  const size = getHDSize(ratio);
  const base = {
    prompt: `${prompt}, high quality, highly detailed, 4K, professional photography`,
    output_format: opts.outputFormat || "png",
    output_quality: 100,
  };

  if (modelId.includes("wan-2.7") || modelId.includes("wan-video")) {
    // Wan 2.7 Image Pro — uses size param and thinking mode
    const sizeMap = { "0.5K": "1K", "1K": "1K", "2K": "2K" };
    base.size = sizeMap[opts.resolution] || "1K";
    base.thinking_mode = true;
    base.num_outputs = 1;
    if (opts.refImage) {
      base.images = [opts.refImage];
    }
  } else if (modelId.includes("nano-banana")) {
    // Google Nano Banana — uses aspect_ratio and simple prompt
    base.aspect_ratio = getAspectRatio(ratio);
    if (opts.refImage) {
      base.image = opts.refImage;
    }
  } else if (modelId.includes("flux")) {
    // Flux models use aspect_ratio, not width/height
    base.aspect_ratio = getAspectRatio(ratio);
    base.num_outputs = 1;
    if (modelId.includes("1.1-pro")) {
      // Nano Banana Edit — highest quality
      base.guidance = 3.5;
      base.num_inference_steps = 28;
      base.safety_tolerance = 5;
    } else if (modelId.includes("schnell")) {
      base.num_inference_steps = 4;
    }
    if (opts.refImage) {
      base.image = opts.refImage;
      base.prompt_strength = 0.8;
    }
  } else if (modelId.includes("sdxl")) {
    // SDXL / SDXL Lightning
    base.width = size.width;
    base.height = size.height;
    base.num_outputs = 1;
    if (modelId.includes("lightning")) {
      base.scheduler = "K_EULER";
      base.num_inference_steps = 4;
    } else {
      base.num_inference_steps = 30;
      base.refine = "expert_ensemble_refiner";
      base.high_noise_frac = 0.8;
    }
    if (opts.negativePrompt) base.negative_prompt = opts.negativePrompt;
    if (opts.refImage) {
      base.image = opts.refImage;
      base.prompt_strength = 0.75;
    }
  } else {
    // Generic fallback
    base.width = size.width;
    base.height = size.height;
    base.num_outputs = 1;
    if (opts.refImage) {
      base.image = opts.refImage;
      base.prompt_strength = 0.75;
    }
  }

  if (opts.seed) base.seed = parseInt(opts.seed, 10);
  return base;
}

export function buildVideoInput(modelId, prompt, imageUrl, opts = {}) {
  const dur = Math.max(1, Math.round(Number(opts.duration) || 5));
  const enhancedPrompt = `${prompt}, cinematic, smooth motion, high quality`;
  if (modelId.includes("grok")) {
    return {
      prompt: enhancedPrompt,
      image: imageUrl,
      duration: Math.min(dur, 15),
      resolution: "720p",
      aspect_ratio: "16:9",
    };
  } else if (modelId.includes("kling")) {
    return {
      prompt: enhancedPrompt,
      first_frame_image: imageUrl,
      duration: Math.min(dur, 10),
      aspect_ratio: "16:9",
    };
  } else if (modelId.includes("hunyuan")) {
    return {
      prompt: enhancedPrompt,
      image: imageUrl,
      width: 1280,
      height: 720,
      num_frames: 77,
      fps: 24,
    };
  } else if (modelId.includes("luma")) {
    return {
      prompt: enhancedPrompt,
      start_image_url: imageUrl,
      aspect_ratio: "16:9",
    };
  }
  // Generic
  return { prompt, image: imageUrl };
}

export function extractOutputUrl(output) {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output[0];
  if (output.url) return output.url;
  if (output.video) return typeof output.video === "string" ? output.video : output.video?.url;
  return null;
}

/* ─── Execute a single process node ─── */
export async function runProcessNode(nodeId) {
  const node = pipelineStore.nodes.find((n) => n.id === nodeId);
  if (!node || node.data.status === "running") return;

  let prompt = node.data.prompt;
  if (!prompt) {
    // Check ALL incoming edges for a prompt source (prompt node or upstream process)
    const inEdges = pipelineStore.edges.filter((e) => e.to === nodeId);
    for (const edge of inEdges) {
      const upstream = pipelineStore.nodes.find((n) => n.id === edge.from);
      if (upstream?.data?.prompt) { prompt = upstream.data.prompt; break; }
    }
  }
  if (!prompt) { updateNodeData(nodeId, { error: "No prompt provided" }); return; }

  node.data.status = "running";
  node.data.error = "";
  node.data.outputUrl = "";

  const outEdge = pipelineStore.edges.find((e) => e.from === nodeId);
  const outputNode = outEdge ? pipelineStore.nodes.find((n) => n.id === outEdge.to) : null;
  if (outputNode) { outputNode.data.status = "running"; outputNode.data.url = ""; }

  try {
    if (node.nodeType === "process") {
      // Check for reference image from upstream
      let refImageUrl = "";
      const inEdges = pipelineStore.edges.filter((e) => e.to === nodeId);
      for (const e of inEdges) {
        const up = pipelineStore.nodes.find((n) => n.id === e.from);
        if (up?.nodeType === "imageInput" && up.data.imageUrl) {
          refImageUrl = up.data.imageUrl;
          break;
        }
      }

      const primaryModelId = node.data.model || IMAGE_MODELS[0].id;
      const refData = refImageUrl ? await toDataUrl(refImageUrl) : null;
      const imgOpts = {
        outputFormat: node.data.outputFormat,
        negativePrompt: node.data.negativePrompt,
        seed: node.data.seed,
        refImage: refData,
      };

      // Try selected model first, then fallback to other image models
      const fallbackModels = IMAGE_MODELS.filter((m) => m.id !== primaryModelId);
      const modelsToTry = [{ id: primaryModelId }, ...fallbackModels];

      let url = null;
      let lastErr = null;
      for (const model of modelsToTry) {
        try {
          node.data.error = model.id !== primaryModelId
            ? `Retrying with ${model.label || model.id}...`
            : "";
          const input = buildImageInput(model.id, prompt, node.data.ratio, imgOpts);
          const output = await replicateRun(model.id, input);
          url = extractOutputUrl(output);
          if (url) {
            node.data.model = model.id;
            node.data.modelLabel = model.label || model.id;
            break;
          }
        } catch (err) {
          lastErr = err;
          continue;
        }
      }

      if (!url) throw lastErr || new Error("All image models failed");

      node.data.outputUrl = url;
      node.data.status = "done";
      node.data.error = "";
      if (outputNode) { outputNode.data.url = url; outputNode.data.status = "done"; outputNode.data.type = "image"; }

    } else if (node.nodeType === "videoMerge") {
      let video1 = node.data.video1Url || "";
      let video2 = node.data.video2Url || "";

      // Pull video URLs from upstream output/videoProcess nodes
      const inEdges = pipelineStore.edges.filter((e) => e.to === nodeId);
      const upstreamVideos = [];
      for (const e of inEdges) {
        const up = pipelineStore.nodes.find((n) => n.id === e.from);
        if (up?.data?.url) upstreamVideos.push(up.data.url);
        else if (up?.data?.outputUrl) upstreamVideos.push(up.data.outputUrl);
      }
      if (!video1 && upstreamVideos[0]) video1 = upstreamVideos[0];
      if (!video2 && upstreamVideos[1]) video2 = upstreamVideos[1];

      if (!video1 || !video2) throw new Error("Two video inputs required for merge");

      const output = await replicateRun("lucataco/video-merge", { video_files: [video1, video2] });
      const videoUrl = extractOutputUrl(output);

      node.data.outputUrl = videoUrl;
      node.data.status = "done";
      if (outputNode) { outputNode.data.url = videoUrl; outputNode.data.status = "done"; outputNode.data.type = "video"; }

    } else if (node.nodeType === "videoAudioMerge") {
      let videoUrl = node.data.videoUrl || "";
      let audioUrl = node.data.audioUrl || "";

      // Pull from upstream
      const inEdges = pipelineStore.edges.filter((e) => e.to === nodeId);
      for (const e of inEdges) {
        const up = pipelineStore.nodes.find((n) => n.id === e.from);
        if (up?.data?.url && !videoUrl) videoUrl = up.data.url;
        else if (up?.data?.outputUrl && !videoUrl) videoUrl = up.data.outputUrl;
      }

      if (!videoUrl || !audioUrl) throw new Error("Both video and audio URLs are required");

      const output = await replicateRun("lucataco/video-audio-merge", { video_file: videoUrl, audio_file: audioUrl });
      const resultUrl = extractOutputUrl(output);

      node.data.outputUrl = resultUrl;
      node.data.status = "done";
      if (outputNode) { outputNode.data.url = resultUrl; outputNode.data.status = "done"; outputNode.data.type = "video"; }

    } else if (node.nodeType === "videoProcess") {
      // Get reference image
      let imageUrl = node.data.referenceImageUrl || "";
      if (!imageUrl) {
        const inEdges = pipelineStore.edges.filter((e) => e.to === nodeId);
        for (const e of inEdges) {
          const up = pipelineStore.nodes.find((n) => n.id === e.from);
          if (up?.nodeType === "imageInput" && up.data.imageUrl) {
            imageUrl = up.data.imageUrl;
            break;
          }
        }
      }

      // If no reference image, generate a base frame first
      if (!imageUrl) {
        const frameInput = buildImageInput(IMAGE_MODELS[0].id, `${prompt}, cinematic still frame`, "landscape_16_9", {});
        const frameOutput = await replicateRun(IMAGE_MODELS[0].id, frameInput);
        imageUrl = extractOutputUrl(frameOutput);
      } else {
        // Convert local URLs to data URLs for Replicate
        imageUrl = await toDataUrl(imageUrl);
      }

      // Try selected model first, then fallback to other video models
      const primaryModelId = node.data.model || VIDEO_MODELS[0].id;
      const fallbackModels = VIDEO_MODELS.filter((m) => m.id !== primaryModelId);
      const modelsToTry = [{ id: primaryModelId }, ...fallbackModels];

      let videoUrl = null;
      let lastErr = null;
      for (const model of modelsToTry) {
        try {
          node.data.error = model.id !== primaryModelId
            ? `Retrying with ${model.label || model.id}...`
            : "";
          const videoInput = buildVideoInput(model.id, prompt, imageUrl, { duration: node.data.duration });
          const output = await replicateRun(model.id, videoInput);
          videoUrl = extractOutputUrl(output);
          if (videoUrl) {
            node.data.model = model.id;
            node.data.modelLabel = model.label || model.id;
            break;
          }
        } catch (err) {
          lastErr = err;
          continue;
        }
      }

      if (!videoUrl) throw lastErr || new Error("All video models failed");

      node.data.outputUrl = videoUrl;
      node.data.status = "done";
      node.data.error = "";
      if (outputNode) { outputNode.data.url = videoUrl; outputNode.data.status = "done"; outputNode.data.type = "video"; }
    }
  } catch (err) {
    node.data.status = "error";
    node.data.error = err.message || "Generation failed";
    if (outputNode) { outputNode.data.status = "error"; }
  }
}

/* ─── Run entire pipeline ─── */
export async function runFullPipeline() {
  if (pipelineStore.running) return;
  pipelineStore.running = true;

  const processNodes = pipelineStore.nodes.filter((n) => n.nodeType === "process" || n.nodeType === "videoProcess" || n.nodeType === "videoMerge" || n.nodeType === "videoAudioMerge");
  for (const node of processNodes) {
    await runProcessNode(node.id);
  }

  pipelineStore.running = false;
}

/* ─── Re-run existing pipeline (reset statuses, then run) ─── */
export async function reRunPipeline() {
  if (pipelineStore.running) return;
  resetNodeStatuses();
  pushMsg("system", "Re-running pipeline...", { nodeEvent: true });
  await runFullPipeline();
  pushMsg("agent", "Pipeline re-run complete. Check the output nodes.\n\nWant me to **re-run**, **modify**, or **build a new pipeline**?");
}

/* ─── Modify pipeline prompts and re-run ─── */
export async function modifyPipeline(newPrompt) {
  if (pipelineStore.running) return;

  // Update all prompt and process nodes
  const promptNodes = pipelineStore.nodes.filter((n) => n.nodeType === "prompt");
  const processNodes = pipelineStore.nodes.filter((n) => n.nodeType === "process" || n.nodeType === "videoProcess");

  promptNodes.forEach((n) => { n.data.prompt = newPrompt; });
  processNodes.forEach((n) => { n.data.prompt = newPrompt; });

  resetNodeStatuses();
  pushMsg("system", `Modified prompt to: "${newPrompt}"`, { nodeEvent: true });
  await runFullPipeline();
  pushMsg("agent", "Modified pipeline complete. Check the outputs.\n\nWant me to **re-run**, **modify**, or **build a new pipeline**?");
}

/* ─── Reset pipeline node statuses (for re-run) ─── */
function resetNodeStatuses() {
  for (const node of pipelineStore.nodes) {
    if (node.nodeType === "process" || node.nodeType === "videoProcess" || node.nodeType === "videoMerge" || node.nodeType === "videoAudioMerge") {
      node.data.status = "idle";
      node.data.outputUrl = "";
      node.data.error = "";
    }
    if (node.nodeType === "output") {
      node.data.status = "waiting";
      node.data.url = "";
    }
  }
}
