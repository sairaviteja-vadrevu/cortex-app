import { apiFetch } from "../utils/api";
import { authStore } from "./authStore";
import * as sbApi from "../utils/storyboardApi";
import { proxy, subscribe } from "valtio";

const shortId = () => crypto.randomUUID().split("-")[0];

function getStorageKey() {
  const userId = authStore.user?.id;
  return userId ? `g5-movies-${userId}` : "g5-movies";
}

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(getStorageKey());
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const movieStore = proxy({
  movies: loadFromStorage(),
  // Backend storyboard projects
  projects: [],
  projectsLoading: false,
  activeProject: null,
  activeProjectLoading: false,
  providers: [],
});

subscribe(movieStore, () => {
  const key = getStorageKey();
  localStorage.setItem(key, JSON.stringify(movieStore.movies));
});

// Reload movies when user changes
export const reloadMovies = () => {
  movieStore.movies = loadFromStorage();
};

// ── Legacy local movie CRUD (kept for backward compat) ──

export const createMovie = (name, { description = "", genre = "", visualStyle = "" } = {}) => {
  const movie = {
    id: shortId(),
    name,
    description,
    genre,
    visualStyle,
    thumbnail: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "draft",
    script: { raw: "", format: "text" },
    scenes: [],
    characters: [],
    locations: [],
    assets: [],
    styleGuide: "",
    processingStatus: "idle",
    processingJobId: null,
    processingError: null,
  };
  movieStore.movies.push(movie);
  return movie.id;
};

export const deleteMovie = (id) => {
  const idx = movieStore.movies.findIndex((m) => m.id === id);
  if (idx !== -1) movieStore.movies.splice(idx, 1);
};

export const getMovie = (id) => movieStore.movies.find((m) => m.id === id) || null;

export const updateMovie = (id, data) => {
  const movie = getMovie(id);
  if (movie) {
    Object.assign(movie, data, { updatedAt: Date.now() });
  }
};

export const updateScript = (movieId, rawText) => {
  const movie = getMovie(movieId);
  if (movie) {
    movie.script.raw = rawText;
    movie.updatedAt = Date.now();
  }
};

// ── Backend storyboard project functions ──

export const fetchProviders = async () => {
  try {
    movieStore.providers = await sbApi.getProviders();
  } catch (err) {
    console.warn("Failed to fetch providers:", err);
    movieStore.providers = [];
  }
};

export const fetchProjects = async () => {
  movieStore.projectsLoading = true;
  try {
    movieStore.projects = await sbApi.listProjects();
  } catch (err) {
    console.error("Failed to fetch projects:", err);
  } finally {
    movieStore.projectsLoading = false;
  }
};

export const fetchProject = async (projectId) => {
  movieStore.activeProjectLoading = true;
  try {
    movieStore.activeProject = await sbApi.getProject(projectId);
    return movieStore.activeProject;
  } catch (err) {
    console.error("Failed to fetch project:", err);
    return null;
  } finally {
    movieStore.activeProjectLoading = false;
  }
};

export const createStoryboardProject = async ({
  title,
  scriptFile,
  scriptText,
  genre,
  aesthetic,
  durationMinutes,
  llmProvider,
  llmModel,
  visualStyle,
  notes,
}) => {
  const formData = new FormData();
  formData.append("title", title);
  if (scriptFile) formData.append("script", scriptFile);
  if (scriptText) formData.append("script_text", scriptText);
  if (genre) formData.append("genre", genre);
  if (aesthetic) formData.append("aesthetic", aesthetic);
  if (durationMinutes) formData.append("duration_minutes", durationMinutes);
  if (llmProvider) formData.append("llm_provider", llmProvider);
  if (llmModel) formData.append("llm_model", llmModel);
  if (visualStyle) formData.append("visual_style", visualStyle);
  if (notes) formData.append("notes", notes);

  const result = await sbApi.createProject(formData);
  // Refresh project list
  fetchProjects();
  return result;
};

export const pollProjectStatus = async (projectId, onProgress) => {
  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const status = await sbApi.getProjectStatus(projectId);
      if (onProgress) onProgress(status);
      if (status.status === "ready") return status;
      if (status.status === "error" || status.status === "cancelled") {
        throw new Error(status.error_message || `Project ${status.status}`);
      }
    } catch (err) {
      if (err.message?.includes("Session expired")) throw err;
      // Network error, keep polling
      console.warn("Poll error:", err);
    }
  }
};

export const cancelStoryboardProject = async (projectId) => {
  return sbApi.cancelProject(projectId);
};

export const retryStoryboardProject = async (projectId, llmModel) => {
  return sbApi.retryProject(projectId, llmModel);
};

export const deleteStoryboardProject = async (projectId) => {
  await sbApi.deleteProject(projectId);
  movieStore.projects = movieStore.projects.filter((p) => p.project_id !== projectId);
  if (movieStore.activeProject?.project_id === projectId) {
    movieStore.activeProject = null;
  }
};

export const generateEntityImage = async (projectId, entityType, entityId) => {
  return sbApi.generateEntityImage(projectId, entityType, entityId);
};

export const generateShotImage = async (projectId, sceneNumber, shotNumber) => {
  return sbApi.generateShotImage(projectId, sceneNumber, shotNumber);
};

export const updateCharacter = async (projectId, characterId, data) => {
  return sbApi.updateCharacter(projectId, characterId, data);
};

// Reload on auth change
import { onAuthChange } from "./authStore";
onAuthChange(reloadMovies);

// Re-export from split files so existing imports continue to work
export * from "./movieLegacyActions";
export * from "./movieProductionPipeline";
