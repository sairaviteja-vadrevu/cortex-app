import { apiFetch } from "../utils/api";
import { movieStore, getMovie } from "./movieStore";

const shortId = () => crypto.randomUUID().split("-")[0];

// ── Legacy async screenplay processing ──

export const processScreenplay = async (movieId) => {
  const movie = getMovie(movieId);
  if (!movie || !movie.script.raw) return;

  movie.processingStatus = "processing";
  movie.processingError = null;

  try {
    const res = await apiFetch("/api/process-screenplay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: movie.script.raw }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Submit failed: ${res.status} - ${err.slice(0, 200)}`);
    }

    const { jobId } = await res.json();
    movie.processingJobId = jobId;

    while (true) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(`/api/jobs/${jobId}`);
      if (!pollRes.ok) continue;
      const job = await pollRes.json();
      if (job.status === "ready") {
        applyProcessingResult(movie, job.result);
        movie.processingStatus = "ready";
        break;
      }
      if (job.status === "error") {
        throw new Error(job.error || "Processing failed");
      }
    }
  } catch (err) {
    movie.processingStatus = "error";
    movie.processingError = err.message;
    throw err;
  }
};

export const splitScriptToScenes = async (movieId) => {
  const movie = getMovie(movieId);
  if (!movie || !movie.script.raw) return;

  movie.processingStatus = "processing";
  movie.processingError = null;

  try {
    const response = await apiFetch("/api/split-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: movie.script.raw }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Split scenes failed: ${response.status} - ${err.slice(0, 200)}`);
    }

    const parsed = await response.json();
    applyProcessingResult(movie, parsed);
    movie.processingStatus = "ready";
  } catch (err) {
    movie.processingStatus = "error";
    movie.processingError = err.message;
    throw err;
  }
};

function applyProcessingResult(movie, parsed) {
  if (parsed.styleGuide) movie.styleGuide = parsed.styleGuide;

  if (parsed.scenes && Array.isArray(parsed.scenes)) {
    movie.scenes = parsed.scenes.map((scene, i) => ({
      id: shortId(),
      number: scene.number || i + 1,
      heading: scene.heading || `Scene ${i + 1}`,
      title: scene.title || scene.heading || `Scene ${i + 1}`,
      description: scene.description || "",
      scriptExcerpt: scene.scriptExcerpt || "",
      characters: scene.characters || [],
      mood: scene.mood || "",
      notes: scene.mood ? `Mood: ${scene.mood}` : "",
      status: "todo",
      location: scene.location || null,
      dialogueLines: (scene.dialogueLines || []).map((d) => ({
        id: shortId(),
        character: d.character || "",
        text: d.text || "",
        direction: d.direction || "",
      })),
      shots: (scene.shots || []).map((shot, j) => ({
        id: shortId(),
        shotNumber: shot.shotNumber || j + 1,
        cameraSize: shot.cameraSize || "wide",
        cameraAngle: shot.cameraAngle || "eye-level",
        cameraMovement: shot.cameraMovement || "static",
        lighting: shot.lighting || "",
        description: shot.description || "",
        imageUrl: null,
        prompt: "",
      })),
      assets: scene.assets || [],
      storyboardFrames: [],
    }));
  }

  if (parsed.characters && Array.isArray(parsed.characters)) {
    movie.characters = parsed.characters.map((char) => ({
      id: shortId(),
      name: char.name || "",
      description: char.description || "",
      tier: char.tier || "primary",
      scenes: char.scenes || [],
      imageUrl: null,
      modelUrl: null,
      voiceNotes: "",
    }));
  }

  if (parsed.locations && Array.isArray(parsed.locations)) {
    movie.locations = parsed.locations.map((loc) => ({
      id: shortId(),
      name: loc.name || "",
      description: loc.description || "",
      interiorExterior: loc.interiorExterior || "",
      timeOfDay: loc.timeOfDay || "",
      scenes: loc.scenes || [],
      imageUrl: null,
    }));
  }

  if (parsed.assets && Array.isArray(parsed.assets)) {
    movie.assets = parsed.assets.map((asset) => ({
      id: shortId(),
      name: asset.name || "",
      category: asset.category || "prop",
      description: asset.description || "",
      scenes: asset.scenes || [],
      imageUrl: null,
    }));
  }

  movie.updatedAt = Date.now();
}

// ── Shot actions ──

export const addShot = (movieId, sceneId, shot) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  const scene = movie.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.shots.push({
    id: shortId(),
    shotNumber: scene.shots.length + 1,
    cameraSize: "wide",
    cameraAngle: "eye-level",
    cameraMovement: "static",
    lighting: "",
    description: "",
    imageUrl: null,
    prompt: "",
    ...shot,
  });
  movie.updatedAt = Date.now();
};

export const updateShot = (movieId, sceneId, shotId, data) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  const scene = movie.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const shot = scene.shots.find((s) => s.id === shotId);
  if (shot) Object.assign(shot, data);
  movie.updatedAt = Date.now();
};

export const addStoryboardFrame = (movieId, sceneId, frame) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  const scene = movie.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.storyboardFrames.push({
    id: shortId(),
    imageUrl: null,
    prompt: "",
    caption: "",
    cameraAngle: "wide",
    order: scene.storyboardFrames.length,
    ...frame,
  });
  movie.updatedAt = Date.now();
};

export const addMovieCharacter = (movieId, character) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  movie.characters.push({
    id: shortId(),
    name: "",
    description: "",
    imageUrl: null,
    ...character,
  });
  movie.updatedAt = Date.now();
};

export const buildShotPrompt = (movieId, sceneId, shotId) => {
  const movie = getMovie(movieId);
  if (!movie) return "";
  const scene = movie.scenes.find((s) => s.id === sceneId);
  if (!scene) return "";
  const shot = scene.shots.find((s) => s.id === shotId);
  if (!shot) return "";

  const parts = ["Cinematic film still"];
  if (movie.styleGuide) parts.push(`Style: ${movie.styleGuide}`);
  parts.push(`${shot.cameraSize} shot, ${shot.cameraAngle} angle, ${shot.cameraMovement} camera`);
  if (shot.lighting) parts.push(`Lighting: ${shot.lighting}`);
  parts.push(shot.description || scene.description);

  if (movie.characters?.length > 0 && scene.characters?.length > 0) {
    const sceneChars = movie.characters.filter(
      (c) => c.description && scene.characters.some((n) => n.toLowerCase() === c.name.toLowerCase())
    );
    if (sceneChars.length > 0) {
      parts.push(`Characters: ${sceneChars.map((c) => `${c.name}: ${c.description}`).join(". ")}`);
    }
  }

  parts.push("high quality, cinematic");
  return parts.join(", ");
};

export const buildCinematicPrompt = (movieId, scenePrompt, prefix = "Cinematic film still") => {
  const movie = getMovie(movieId);
  if (!movie) return `${prefix}, ${scenePrompt}, dramatic lighting, movie scene, high quality`;

  const parts = [prefix];
  if (movie.styleGuide) parts.push(`Style: ${movie.styleGuide}`);
  if (movie.characters?.length > 0) {
    const mentionedChars = movie.characters.filter((c) => c.description && scenePrompt.toLowerCase().includes(c.name.toLowerCase()));
    if (mentionedChars.length > 0) {
      parts.push(`Characters: ${mentionedChars.map((c) => `${c.name}: ${c.description}`).join(". ")}`);
    }
  }
  parts.push(scenePrompt);
  parts.push("high quality, cinematic");
  return parts.join(", ");
};

export const getSceneCharacterPortraits = (movieId, scenePrompt) => {
  const movie = getMovie(movieId);
  if (!movie?.characters?.length) return [];
  const promptLower = scenePrompt.toLowerCase();
  return movie.characters
    .filter((c) => c.imageUrl && c.name && promptLower.includes(c.name.toLowerCase()))
    .map((c) => ({ name: c.name, imageUrl: c.imageUrl, description: c.description }));
};

export const updateScene = (movieId, sceneId, data) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  const scene = movie.scenes.find((s) => s.id === sceneId);
  if (scene) {
    Object.assign(scene, data);
    movie.updatedAt = Date.now();
  }
};

export const updateMovieCharacter = (movieId, charId, data) => {
  const movie = getMovie(movieId);
  if (!movie) return;
  const char = movie.characters.find((c) => c.id === charId);
  if (char) Object.assign(char, data);
  movie.updatedAt = Date.now();
};
