import { replicate } from "../utils/replicate";
import { movieStore, fetchProject, generateShotImage } from "./movieStore";
import * as sbApi from "../utils/storyboardApi";

const VIDEO_MODEL = "xai/grok-imagine-video";
const VIDEO_FALLBACKS = ["kwaivgi/kling-v3-video", "kwaivgi/kling-v3-omni-video"];
const MUSIC_MODEL = "meta/musicgen";
const VIDEO_MERGE_MODEL = "lucataco/video-merge";
const AUDIO_VIDEO_MERGE_MODEL = "lucataco/video-audio-merge";

/* ─── Multi-language TTS ─── */

// Language → TTS model routing
const TTS_MODELS = {
  kokoro: "jaaari/kokoro-82m",        // English, Japanese, French, Hindi, Italian, Mandarin, Portuguese, Spanish
  indic: "ai4bharat/indic-parler-tts", // Telugu, Tamil, Hindi, Bengali, Kannada, Malayalam, Marathi, Gujarati, Odia, Punjabi + more
};

// Kokoro-supported language codes
const KOKORO_LANGS = new Set(["en", "ja", "fr", "hi", "it", "zh", "pt", "es"]);

// Indic language codes (Indian languages not well covered by Kokoro)
const INDIC_LANGS = new Set(["te", "ta", "bn", "kn", "ml", "mr", "gu", "or", "pa", "as", "mni", "sat"]);

// Language display names for UI
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", engine: "kokoro" },
  { code: "hi", name: "Hindi", engine: "kokoro" },
  { code: "te", name: "Telugu", engine: "indic" },
  { code: "ta", name: "Tamil", engine: "indic" },
  { code: "bn", name: "Bengali", engine: "indic" },
  { code: "kn", name: "Kannada", engine: "indic" },
  { code: "ml", name: "Malayalam", engine: "indic" },
  { code: "mr", name: "Marathi", engine: "indic" },
  { code: "gu", name: "Gujarati", engine: "indic" },
  { code: "pa", name: "Punjabi", engine: "indic" },
  { code: "ja", name: "Japanese", engine: "kokoro" },
  { code: "fr", name: "French", engine: "kokoro" },
  { code: "it", name: "Italian", engine: "kokoro" },
  { code: "zh", name: "Mandarin", engine: "kokoro" },
  { code: "pt", name: "Portuguese", engine: "kokoro" },
  { code: "es", name: "Spanish", engine: "kokoro" },
];

function getTTSEngine(langCode) {
  if (INDIC_LANGS.has(langCode)) return "indic";
  if (KOKORO_LANGS.has(langCode)) return "kokoro";
  return "kokoro"; // default fallback
}

async function generateTTSClip(text, voice, langCode) {
  const engine = getTTSEngine(langCode);

  if (engine === "indic") {
    // Indic Parler TTS — uses language code and description-based voice control
    const genderDesc = voice.includes("f_") || voice.includes("female") ? "a female speaker" : "a male speaker";
    const output = await replicate(TTS_MODELS.indic, {
      text,
      language: langCode,
      description: `${genderDesc} with a clear and natural voice, speaking at a moderate pace`,
    });
    return Array.isArray(output) ? output[0] : output;
  }

  // Kokoro — uses voice presets
  const output = await replicate(TTS_MODELS.kokoro, { text, speed: 1.0, voice: voice || "bm_george" });
  return Array.isArray(output) ? output[0] : output;
}

// Kokoro voice presets mapped by character archetype (validated against API)
export const VOICE_PRESETS = [
  // American Female
  { id: "af_bella", label: "Bella (Female)", gender: "female", age: "adult" },
  { id: "af_sarah", label: "Sarah (Female)", gender: "female", age: "adult" },
  { id: "af_nicole", label: "Nicole (Mature Female)", gender: "female", age: "mature" },
  { id: "af_sky", label: "Sky (Young Female)", gender: "female", age: "young" },
  { id: "af_nova", label: "Nova (Female)", gender: "female", age: "adult" },
  { id: "af_jessica", label: "Jessica (Female)", gender: "female", age: "adult" },
  // American Male
  { id: "am_adam", label: "Adam (Young Male)", gender: "male", age: "young" },
  { id: "am_michael", label: "Michael (Male)", gender: "male", age: "adult" },
  { id: "am_liam", label: "Liam (Deep Male)", gender: "male", age: "adult" },
  { id: "am_eric", label: "Eric (Male)", gender: "male", age: "adult" },
  { id: "am_fenrir", label: "Fenrir (Dark Male)", gender: "male", age: "mature" },
  { id: "am_onyx", label: "Onyx (Deep Male)", gender: "male", age: "mature" },
  // British Female
  { id: "bf_emma", label: "Emma (British Female)", gender: "female", age: "adult" },
  { id: "bf_isabella", label: "Isabella (British Female)", gender: "female", age: "young" },
  { id: "bf_lily", label: "Lily (British Female)", gender: "female", age: "young" },
  // British Male
  { id: "bm_george", label: "George (British Male)", gender: "male", age: "mature" },
  { id: "bm_lewis", label: "Lewis (Older Male)", gender: "male", age: "old" },
  { id: "bm_daniel", label: "Daniel (British Male)", gender: "male", age: "adult" },
  // Hindi
  { id: "hf_alpha", label: "Hindi Female", gender: "female", age: "adult" },
  { id: "hf_beta", label: "Hindi Female 2", gender: "female", age: "young" },
  { id: "hm_omega", label: "Hindi Male", gender: "male", age: "adult" },
  { id: "hm_psi", label: "Hindi Male 2", gender: "male", age: "mature" },
];

function autoAssignVoice(character, usedVoices) {
  // If already assigned, use it
  if (character.voice_id) return character.voice_id;

  const meta = character.metadata || {};
  const gender = (meta.gender || "").toLowerCase();
  const age = (meta.age_range || "").toLowerCase();

  const isMale = gender.includes("male") && !gender.includes("female");
  const isFemale = gender.includes("female");
  const isOld = age.includes("elder") || age.includes("old") || age.includes("70") || age.includes("80") || age.includes("senior");
  const isYoung = age.includes("teen") || age.includes("child") || age.includes("young") || age.includes("boy") || age.includes("girl") || age.includes("10") || age.includes("11") || age.includes("12");

  // Filter by gender
  let candidates = VOICE_PRESETS;
  if (isMale) candidates = candidates.filter((v) => v.gender === "male");
  else if (isFemale) candidates = candidates.filter((v) => v.gender === "female");

  // Filter by age
  if (isOld) candidates = candidates.filter((v) => v.age === "mature" || v.age === "old");
  else if (isYoung) candidates = candidates.filter((v) => v.age === "young");

  if (candidates.length === 0) candidates = VOICE_PRESETS;

  // Prefer unused voices
  const unused = candidates.filter((v) => !usedVoices.has(v.id));
  const pick = unused.length > 0 ? unused[0] : candidates[0];
  usedVoices.add(pick.id);
  return pick.id;
}

function getShot(project, sceneNumber, shotNumber) {
  const scene = project.scenes?.find((s) => s.scene_number === sceneNumber);
  return scene?.shots?.find((s) => s.shot_number === shotNumber);
}

function getScene(project, sceneNumber) {
  return project.scenes?.find((s) => s.scene_number === sceneNumber);
}

async function replicateWithFallback(models, input) {
  let lastErr;
  for (const model of models) {
    try {
      return await replicate(model, input);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("All models failed");
}

function buildVideoModelInput(modelId, prompt, imageUrl, duration) {
  const dur = Math.max(1, Math.round(Number(duration) || 5));
  const enhancedPrompt = `${prompt}, cinematic, smooth motion, high quality`;
  if (modelId.includes("grok")) {
    return { prompt: enhancedPrompt, image: imageUrl, duration: Math.min(dur, 15), resolution: "720p", aspect_ratio: "16:9" };
  } else if (modelId.includes("kling")) {
    return { prompt: enhancedPrompt, first_frame_image: imageUrl, duration: Math.min(dur, 10), aspect_ratio: "16:9" };
  } else if (modelId.includes("hunyuan")) {
    return { prompt: enhancedPrompt, image: imageUrl, width: 1280, height: 720, num_frames: 77, fps: 24 };
  } else if (modelId.includes("luma")) {
    return { prompt: enhancedPrompt, start_image_url: imageUrl, aspect_ratio: "16:9" };
  }
  return { prompt: enhancedPrompt, image: imageUrl, duration: dur, resolution: "720p", aspect_ratio: "16:9" };
}

export const generateShotVideo = async (projectId, sceneNumber, shotNumber) => {
  const proj = movieStore.activeProject;
  const shot = getShot(proj, sceneNumber, shotNumber);
  if (!shot?.image_url) throw new Error("Shot image required before generating video");

  // Use the original remote URL for Replicate. If only local path exists, convert to data URI.
  let imageUrl = shot.image_url_remote || shot.image_url;
  if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
    const resp = await fetch(imageUrl);
    const blob = await resp.blob();
    imageUrl = await new Promise((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob); });
  }
  const prompt = shot.description || "";
  const duration = Math.min(Math.round(shot.duration_seconds || 5), 10);
  const models = [VIDEO_MODEL, ...VIDEO_FALLBACKS];

  let lastErr;
  for (const model of models) {
    try {
      const input = buildVideoModelInput(model, prompt, imageUrl, duration);
      const output = await replicate(model, input);
      const videoUrl = Array.isArray(output) ? output[0] : output;
      await sbApi.updateShot(projectId, sceneNumber, shotNumber, { video_url: videoUrl });
      return videoUrl;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("All video models failed");
};

export const generateAllShotImages = async (projectId, sceneNumber, onProgress) => {
  const scene = getScene(movieStore.activeProject, sceneNumber);
  if (!scene) return;
  const shots = (scene.shots || []).filter((s) => !s.image_url);
  let completed = 0;
  for (const shot of shots) {
    await generateShotImage(projectId, sceneNumber, shot.shot_number);
    completed++;
    onProgress?.({ completed, total: shots.length });
  }
  await fetchProject(projectId);
};

export const generateAllShotVideos = async (projectId, sceneNumber, onProgress) => {
  // Refresh to get latest image_urls
  await fetchProject(projectId);
  const scene = getScene(movieStore.activeProject, sceneNumber);
  if (!scene) return;
  const shots = (scene.shots || []).filter((s) => s.image_url && !s.video_url);
  let completed = 0;
  for (const shot of shots) {
    try {
      await generateShotVideo(projectId, sceneNumber, shot.shot_number);
    } catch (err) {
      console.error(`Shot ${shot.shot_number} video failed:`, err);
    }
    completed++;
    onProgress?.({ completed, total: shots.length });
  }
  await fetchProject(projectId);
};

/** Ensure a URL is publicly accessible for Replicate. Converts local /uploads/ paths to data URIs. */
async function ensureRemoteUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob); });
}

async function mergeVideos(urls) {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  // First merge produces a Replicate URL, so subsequent merges can use it directly
  let merged = await ensureRemoteUrl(urls[0]);
  for (let i = 1; i < urls.length; i++) {
    const next = await ensureRemoteUrl(urls[i]);
    const output = await replicate(VIDEO_MERGE_MODEL, { video_files: [merged, next] });
    merged = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : output?.url || merged);
  }
  return merged;
}

export const assembleSceneVideo = async (projectId, sceneNumber) => {
  await fetchProject(projectId);
  const scene = getScene(movieStore.activeProject, sceneNumber);
  if (!scene) throw new Error("Scene not found");
  // Prefer remote URLs for Replicate access, fall back to local
  const videoUrls = (scene.shots || []).map((s) => s.video_url_remote || s.video_url).filter(Boolean);
  if (videoUrls.length === 0) throw new Error("No shot videos to assemble");
  const sceneVideoUrl = await mergeVideos(videoUrls);
  await sbApi.updateScene(projectId, sceneNumber, { scene_video_url: sceneVideoUrl });
  await fetchProject(projectId);
  return sceneVideoUrl;
};

/**
 * Concatenate multiple audio URLs into a single audio blob using Web Audio API.
 * Returns an object URL to the merged audio.
 */
async function concatAudioClips(urls) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffers = [];
  for (const url of urls) {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    buffers.push(decoded);
  }

  // Calculate total length with 0.3s silence gaps between clips
  const GAP = 0.3;
  const sampleRate = buffers[0]?.sampleRate || 44100;
  const gapSamples = Math.floor(GAP * sampleRate);
  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
    if (i < buffers.length - 1) totalLength += gapSamples;
  }

  const merged = ctx.createBuffer(1, totalLength, sampleRate);
  const channel = merged.getChannelData(0);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const src = buffers[i].getChannelData(0);
    channel.set(src, offset);
    offset += src.length;
    if (i < buffers.length - 1) offset += gapSamples; // silence gap
  }

  // Encode to WAV
  const wavBlob = audioBufferToWav(merged);
  ctx.close();
  return URL.createObjectURL(wavBlob);
}

function audioBufferToWav(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const wavBuf = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(wavBuf);

  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, data.length * 2, true);
  let off = 44;
  for (let i = 0; i < data.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([wavBuf], { type: "audio/wav" });
}

export const generateSceneVoiceover = async (projectId, sceneNumber, onProgress) => {
  const proj = movieStore.activeProject;
  const scene = getScene(proj, sceneNumber);
  if (!scene) throw new Error("Scene not found");

  const langCode = proj.detected_language || "en";

  const dialogue = scene.dialogue || [];
  if (dialogue.length === 0) {
    // No dialogue — narrate synopsis with narrator voice
    const text = scene.synopsis || scene.action_description || "Scene narration.";
    const clipUrl = await generateTTSClip(text, "bm_george", langCode);
    await sbApi.updateScene(projectId, sceneNumber, { voiceover_url: clipUrl });
    await fetchProject(projectId);
    return clipUrl;
  }

  // Build character → voice mapping using metadata (gender, age)
  const characters = proj.characters || [];
  const usedVoices = new Set();
  const voiceMap = {};
  for (const line of dialogue) {
    const charName = line.character_name || line.character_id;
    if (!voiceMap[charName]) {
      const char = characters.find((c) => c.name === charName || c.id === line.character_id);
      voiceMap[charName] = autoAssignVoice(char || { metadata: {} }, usedVoices);
    }
  }

  // Check if all lines use the same voice (single-character scene)
  const uniqueVoices = [...new Set(dialogue.map((d) => voiceMap[d.character_name || d.character_id] || "bm_george"))];

  let voiceoverUrl;

  if (uniqueVoices.length === 1) {
    // Single character — generate all dialogue in one TTS call for best quality
    const combinedText = dialogue.map((d) => d.text).filter(Boolean).join("... ");
    onProgress?.({ completed: 0, total: 1, character: dialogue[0]?.character_name });
    voiceoverUrl = await generateTTSClip(combinedText, uniqueVoices[0], langCode);
    onProgress?.({ completed: 1, total: 1 });
  } else {
    // Multi-character scene — generate per character, merge by grouping consecutive same-voice lines
    // then chain the clips using video-audio-merge (each clip is a remote URL Replicate can access)
    const groups = [];
    for (const line of dialogue) {
      const voice = voiceMap[line.character_name || line.character_id] || "bm_george";
      const text = (line.text || "").trim();
      if (!text) continue;
      const last = groups[groups.length - 1];
      if (last && last.voice === voice) {
        last.text += "... " + text;
      } else {
        groups.push({ voice, text, character: line.character_name });
      }
    }

    // Generate one clip per voice group (each is a remote Replicate URL)
    const clipUrls = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      onProgress?.({ completed: i, total: groups.length, character: g.character });
      const lineLang = langCode;
      const clipUrl = await generateTTSClip(g.text, g.voice, lineLang);
      if (clipUrl) clipUrls.push(clipUrl);
    }

    if (clipUrls.length === 0) throw new Error("No audio clips generated");
    onProgress?.({ completed: groups.length, total: groups.length, character: "Merging..." });

    if (clipUrls.length === 1) {
      voiceoverUrl = clipUrls[0];
    } else {
      // Chain merge: merge clip1 + clip2 as video+audio, then result + clip3, etc.
      // Use video-audio-merge treating first clip as "video" (it handles audio-only inputs)
      voiceoverUrl = clipUrls[0];
      for (let i = 1; i < clipUrls.length; i++) {
        try {
          const output = await replicate(AUDIO_VIDEO_MERGE_MODEL, { video_file: voiceoverUrl, audio_file: clipUrls[i] });
          voiceoverUrl = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : output?.url || voiceoverUrl);
        } catch (err) {
          // If merge fails, use the longer clip (likely the first accumulated one)
          console.warn("Audio merge failed, using accumulated clip:", err);
          break;
        }
      }
    }
  }

  await sbApi.updateScene(projectId, sceneNumber, { voiceover_url: voiceoverUrl });
  await fetchProject(projectId);
  return voiceoverUrl;
};

export const generateSceneMusic = async (projectId, sceneNumber) => {
  const proj = movieStore.activeProject;
  const scene = getScene(proj, sceneNumber);
  if (!scene) throw new Error("Scene not found");

  const prompt = `${scene.mood || "cinematic"} ${proj.genre || ""} background music, ${scene.music_notes || "film score"}`.trim();
  const duration = Math.min(Math.ceil(scene.estimated_duration_seconds || 30), 30);

  const output = await replicate(MUSIC_MODEL, { prompt, duration, output_format: "mp3" });
  const musicUrl = Array.isArray(output) ? output[0] : output;

  await sbApi.updateScene(projectId, sceneNumber, { music_url: musicUrl });
  await fetchProject(projectId);
  return musicUrl;
};

export const assembleScene = async (projectId, sceneNumber) => {
  await fetchProject(projectId);
  const scene = getScene(movieStore.activeProject, sceneNumber);
  if (!scene) throw new Error("Scene not found");

  // Use remote URLs for Replicate, fall back to data URI conversion for local paths
  let videoUrl = await ensureRemoteUrl(scene.scene_video_url_remote || scene.scene_video_url);
  if (!videoUrl) throw new Error("Scene video required. Assemble shot videos first.");

  const voiceoverUrl = scene.voiceover_url_remote || scene.voiceover_url;
  const musicUrl = scene.music_url_remote || scene.music_url;
  const isValid = (url) => url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"));
  const hasVoiceover = isValid(voiceoverUrl);
  const hasMusic = isValid(musicUrl);

  // video-audio-merge REPLACES the audio track, so we can only add one audio source.
  // Priority: voiceover (dialogue) > music (background).
  if (hasVoiceover) {
    const audio = await ensureRemoteUrl(voiceoverUrl);
    const output = await replicate(AUDIO_VIDEO_MERGE_MODEL, { video_file: videoUrl, audio_file: audio });
    videoUrl = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : output?.url || videoUrl);
  } else if (hasMusic) {
    const audio = await ensureRemoteUrl(musicUrl);
    const output = await replicate(AUDIO_VIDEO_MERGE_MODEL, { video_file: videoUrl, audio_file: audio });
    videoUrl = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : output?.url || videoUrl);
  }

  await sbApi.updateScene(projectId, sceneNumber, { assembled_url: videoUrl });
  await fetchProject(projectId);
  return videoUrl;
};

export const assembleFinalMovie = async (projectId, onProgress) => {
  await fetchProject(projectId);
  const proj = movieStore.activeProject;
  if (!proj) throw new Error("Project not found");

  const sceneUrls = (proj.scenes || [])
    .sort((a, b) => a.scene_number - b.scene_number)
    .map((s) => s.assembled_url_remote || s.assembled_url || s.scene_video_url_remote || s.scene_video_url)
    .filter(Boolean);

  if (sceneUrls.length === 0) throw new Error("No scene videos to assemble");

  if (sceneUrls.length === 1) {
    await sbApi.updateProject(projectId, { final_video_url: sceneUrls[0] });
    await fetchProject(projectId);
    return sceneUrls[0];
  }

  let merged = sceneUrls[0];
  for (let i = 1; i < sceneUrls.length; i++) {
    const output = await replicate(VIDEO_MERGE_MODEL, { video_files: [merged, sceneUrls[i]] });
    merged = Array.isArray(output) ? output[0] : (typeof output === "string" ? output : output?.url || merged);
    onProgress?.({ completed: i, total: sceneUrls.length - 1 });
  }

  await sbApi.updateProject(projectId, { final_video_url: merged });
  await fetchProject(projectId);
  return merged;
};
