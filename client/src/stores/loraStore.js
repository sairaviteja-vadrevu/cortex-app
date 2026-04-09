import { replicate, fileToDataUri } from "../utils/replicate";
import { proxy, subscribe } from "valtio";

const STORAGE_KEY = "g5-lora-training";
const shortId = () => crypto.randomUUID().split("-")[0];

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const TRAINING_MODELS = [
  { id: "fal-ai/flux-lora-fast-training", label: "Flux LoRA Fast", minImages: 4, supportsStyle: true },
  { id: "fal-ai/flux-lora-portrait-trainer", label: "Flux Portrait", minImages: 10, supportsStyle: false },
  { id: "fal-ai/turbo-flux-trainer", label: "Turbo Flux", minImages: 10, supportsStyle: true },
  { id: "fal-ai/hunyuan-video-lora-training", label: "Hunyuan Video LoRA", minImages: 4, supportsStyle: false },
];

export const TRAINING_PRESETS = [
  {
    id: "character",
    label: "Character / Face",
    description: "Train on a person or character — locks identity across angles",
    icon: "user",
    defaults: { model: "fal-ai/flux-lora-portrait-trainer", trainingStyle: "subject", triggerWord: "ohwx" },
  },
  {
    id: "style",
    label: "Style / Aesthetic",
    description: "Capture a visual style — film stock, genre look, color grade",
    icon: "palette",
    defaults: { model: "fal-ai/flux-lora-fast-training", trainingStyle: "style", triggerWord: "sks_style" },
  },
  {
    id: "object",
    label: "Object / Prop",
    description: "Train on a specific object — weapon, accessory, vehicle",
    icon: "cube",
    defaults: { model: "fal-ai/flux-lora-fast-training", trainingStyle: "subject", triggerWord: "sks" },
  },
  {
    id: "cinematic",
    label: "Cinematic Look",
    description: "Film stock emulation — Kodachrome, Portra, CineStill, Tri-X",
    icon: "film",
    defaults: { model: "fal-ai/turbo-flux-trainer", trainingStyle: "style", triggerWord: "cinestyle" },
  },
  {
    id: "video",
    label: "Video LoRA",
    description: "Train a motion LoRA for Hunyuan video generation",
    icon: "video",
    defaults: { model: "fal-ai/hunyuan-video-lora-training", trainingStyle: "subject", triggerWord: "ohwx" },
  },
];

export const TRAINING_STEPS = [
  { key: "uploading", label: "Uploading images" },
  { key: "preprocessing", label: "Preprocessing & captioning" },
  { key: "training", label: "Training model" },
  { key: "validating", label: "Validating output" },
  { key: "done", label: "Complete" },
];

export const loraStore = proxy({
  jobs: loadFromStorage(),
});

subscribe(loraStore, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loraStore.jobs));
});

export function addJob(data) {
  const job = {
    id: shortId(),
    name: "",
    model: TRAINING_MODELS[0].id,
    modelLabel: TRAINING_MODELS[0].label,
    triggerWord: "",
    trainingStyle: "subject",
    steps: null,
    learningRate: null,
    autoCaption: true,
    preset: null,
    status: "idle", // idle | uploading | preprocessing | training | validating | done | error
    currentStep: null,
    progress: "",
    error: "",
    loraFileUrl: null,
    configFileUrl: null,
    imageCount: 0,
    thumbnails: [],
    testImages: [],
    createdAt: Date.now(),
    ...data,
  };
  loraStore.jobs.unshift(job);
  return job.id;
}

export function updateJob(id, patch) {
  const job = loraStore.jobs.find((j) => j.id === id);
  if (job) Object.assign(job, patch);
}

export function removeJob(id) {
  const idx = loraStore.jobs.findIndex((j) => j.id === id);
  if (idx !== -1) loraStore.jobs.splice(idx, 1);
}

export async function startTraining(jobId, zipFile) {
  const job = loraStore.jobs.find((j) => j.id === jobId);
  if (!job || job.status === "training" || job.status === "uploading") return;

  job.status = "uploading";
  job.currentStep = "uploading";
  job.progress = "Uploading training images...";
  job.error = "";

  try {
    // Upload zip as data URI for Replicate
    const uploadedUrl = await fileToDataUri(zipFile);

    job.status = "training";
    job.currentStep = "preprocessing";
    job.progress = "Preprocessing images & starting training...";

    const input = {
      input_images: uploadedUrl,
      steps: job.steps || 1000,
    };

    if (job.triggerWord) input.trigger_word = job.triggerWord;
    if (job.learningRate) input.learning_rate = job.learningRate;
    if (job.autoCaption) input.autocaption = true;

    const output = await replicate("ostris/flux-dev-lora-trainer", input, (prediction) => {
      if (prediction.logs) {
        const lastLine = prediction.logs.split("\n").filter(Boolean).pop();
        if (lastLine) {
          job.progress = lastLine;
          const lower = lastLine.toLowerCase();
          if (lower.includes("step") || lower.includes("training") || lower.includes("epoch")) {
            job.currentStep = "training";
          }
          if (lower.includes("saving") || lower.includes("validat") || lower.includes("convert")) {
            job.currentStep = "validating";
          }
        }
      }
    });

    job.loraFileUrl = Array.isArray(output) ? output[0] : output;
    job.configFileUrl = null;
    job.status = "done";
    job.currentStep = "done";
    job.progress = "Training complete!";
  } catch (err) {
    job.status = "error";
    job.currentStep = null;
    job.error = err.message || "Training failed";
    job.progress = "";
  }
}

export async function testLoRA(jobId, prompt) {
  const job = loraStore.jobs.find((j) => j.id === jobId);
  if (!job || job.status !== "done" || !job.loraFileUrl) return;

  const testEntry = { id: shortId(), prompt, imageUrl: null, status: "generating" };
  job.testImages.push(testEntry);

  try {
    const output = await replicate("google/nano-banana", {
      prompt: `${prompt}, ${job.triggerWord}`,
      num_outputs: 1,
    });
    testEntry.imageUrl = Array.isArray(output) ? output[0] : output;
    testEntry.status = "done";
  } catch (err) {
    testEntry.status = "error";
    testEntry.error = err.message || "Test generation failed";
  }
}
