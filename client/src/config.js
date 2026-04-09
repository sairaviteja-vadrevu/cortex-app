/**
 * API Configuration
 * In development: uses Vite proxy to localhost:8000
 * In production: uses VITE_API_URL environment variable
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Helper function to construct full API URLs
export const getApiUrl = (path) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
