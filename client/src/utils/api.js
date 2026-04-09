import { authStore, signout } from "../stores/authStore";
import { getApiUrl } from "../config";

/**
 * Wrapper around fetch that auto-injects the JWT Authorization header.
 * If a 401 is returned, the user is signed out automatically.
 */
export async function apiFetch(url, options = {}) {
  // Convert relative URLs to absolute URLs using config
  const fullUrl = url.startsWith("http") ? url : getApiUrl(url);
  const headers = { ...options.headers };

  if (authStore.token) {
    headers["Authorization"] = `Bearer ${authStore.token}`;
  }

  const res = await fetch(fullUrl, { ...options, headers });

  if (res.status === 401) {
    signout();
    throw new Error("Session expired. Please sign in again.");
  }

  return res;
}

export const kimodoApi = {
  /**
   * Get Kimodo service status
   */
  async getStatus() {
    const res = await fetch(getApiUrl("/api/kimodo/status"));
    if (!res.ok) throw new Error("Failed to get Kimodo status");
    return res.json();
  },

  /**
   * List available Kimodo models
   */
  async listModels() {
    const res = await fetch(getApiUrl("/api/kimodo/models"));
    if (!res.ok) throw new Error("Failed to list models");
    return res.json();
  },

  /**
   * Get motion generation examples
   */
  async getExamples() {
    const res = await fetch(getApiUrl("/api/kimodo/examples"));
    if (!res.ok) throw new Error("Failed to get examples");
    return res.json();
  },

  /**
   * Generate character motion from text prompt
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Motion description
   * @param {number} params.duration - Duration in seconds
   * @param {string} [params.model] - Model to use
   * @param {Object} [params.constraints] - Motion constraints
   * @param {string} [params.output_format] - Output format (glb, fbx, bvh)
   */
  async generateMotion({ prompt, duration = 5.0, model = null, constraints = null, output_format = "glb" }) {
    const res = await fetch(getApiUrl("/api/kimodo/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        duration,
        model,
        constraints,
        output_format,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Motion generation failed");
    }

    return res.json();
  },

  /**
   * Generate motion and get as downloadable file
   */
  async generateMotionDownload({ prompt, duration = 5.0, model = null, constraints = null, output_format = "glb" }) {
    const res = await fetch(getApiUrl("/api/kimodo/generate/download"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        duration,
        model,
        constraints,
        output_format,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Motion generation failed");
    }

    return res.blob();
  },

  /**
   * Convert base64 motion data to blob URL
   */
  base64ToBlob(base64Data, mimeType = "model/gltf-binary") {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  },
};
