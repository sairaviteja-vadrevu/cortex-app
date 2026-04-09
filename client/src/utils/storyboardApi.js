/**
 * API client for the /api/v1 storyboard backend.
 * Uses JWT token from authStore.
 */
import { authStore } from "../stores/authStore";
import { getApiUrl } from "../config";

const BASE = "/api/v1";

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (authStore.token) {
    headers["Authorization"] = `Bearer ${authStore.token}`;
  }
  const res = await fetch(getApiUrl(`${BASE}${path}`), { ...options, headers });
  return res;
}

async function json(path, options) {
  const res = await request(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Providers ──

export async function getProviders() {
  return json("/providers");
}

// ── Projects ──

export async function createProject(formData) {
  const res = await request("/projects", { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Create failed: ${res.status}`);
  }
  return res.json();
}

export async function listProjects(collectionId) {
  const qs = collectionId ? `?collection_id=${collectionId}` : "";
  return json(`/projects${qs}`);
}

export async function getProject(projectId) {
  return json(`/projects/${projectId}`);
}

export async function getProjectStatus(projectId) {
  return json(`/projects/${projectId}/status`);
}

export async function cancelProject(projectId) {
  return json(`/projects/${projectId}/cancel`, { method: "POST" });
}

export async function retryProject(projectId, llmModel) {
  const formData = new FormData();
  if (llmModel) formData.append("llm_model", llmModel);
  const res = await request(`/projects/${projectId}/retry`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Retry failed");
  return res.json();
}

export async function deleteProject(projectId) {
  const res = await request(`/projects/${projectId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Delete failed");
}

export async function updateProject(projectId, data) {
  return json(`/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ── Characters ──

export async function updateCharacter(projectId, characterId, data) {
  return json(`/projects/${projectId}/characters/${characterId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ── Entity Reference Images ──

export async function uploadEntityReference(projectId, entityType, entityId, { image, referenceDescription }) {
  const formData = new FormData();
  if (image) formData.append("image", image);
  if (referenceDescription) formData.append("reference_description", referenceDescription);
  return json(`/projects/${projectId}/entities/${entityType}/${entityId}/reference`, {
    method: "POST",
    body: formData,
  });
}

// ── Image Generation ──

export async function generateEntityImage(projectId, entityType, entityId) {
  return json(`/projects/${projectId}/entities/${entityType}/${entityId}/generate-image`, {
    method: "POST",
  });
}

export async function generateShotImage(projectId, sceneNumber, shotNumber) {
  return json(`/projects/${projectId}/scenes/${sceneNumber}/shots/${shotNumber}/generate-image`, {
    method: "POST",
  });
}

// ── Entity Updates ──

export async function updateEntity(projectId, entityType, entityId, data) {
  return json(`/projects/${projectId}/entities/${entityType}/${entityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ── Shot & Scene Updates ──

export async function updateShot(projectId, sceneNumber, shotNumber, data) {
  return json(`/projects/${projectId}/scenes/${sceneNumber}/shots/${shotNumber}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateScene(projectId, sceneNumber, data) {
  return json(`/projects/${projectId}/scenes/${sceneNumber}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ── Health ──

export async function healthCheck() {
  return json("/health");
}
