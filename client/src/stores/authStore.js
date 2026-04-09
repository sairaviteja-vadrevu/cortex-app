import { proxy } from "valtio";
import { getApiUrl } from "../config";

const TOKEN_KEY = "g5-token";
const USER_KEY = "g5-user";

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function loadUser() {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export const authStore = proxy({
  token: loadToken(),
  user: loadUser(),
  loading: false,
  error: null,
});

export function isAuthenticated() {
  return !!authStore.token;
}

// Callbacks that other stores register to reload user-scoped data
const _onAuthChange = [];
export function onAuthChange(fn) {
  _onAuthChange.push(fn);
}
function _notifyAuthChange() {
  _onAuthChange.forEach((fn) => fn());
}

export async function signup(name, email, password) {
  authStore.loading = true;
  authStore.error = null;
  try {
    const res = await fetch(getApiUrl("/api/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Signup failed");
    }
    const data = await res.json();
    authStore.token = data.token;
    authStore.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    _notifyAuthChange();
    return data;
  } catch (err) {
    authStore.error = err.message;
    throw err;
  } finally {
    authStore.loading = false;
  }
}

export async function signin(email, password) {
  authStore.loading = true;
  authStore.error = null;
  try {
    const res = await fetch(getApiUrl("/api/auth/signin"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Invalid credentials");
    }
    const data = await res.json();
    authStore.token = data.token;
    authStore.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    _notifyAuthChange();
    return data;
  } catch (err) {
    authStore.error = err.message;
    throw err;
  } finally {
    authStore.loading = false;
  }
}

export function signout() {
  authStore.token = null;
  authStore.user = null;
  authStore.error = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  _notifyAuthChange();
}
