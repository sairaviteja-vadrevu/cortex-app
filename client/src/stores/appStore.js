import { proxy } from "valtio";

function parseRoute(path) {
  if (path === "/" || path === "") return { section: "landing", params: {} };
  if (path === "/dashboard") return { section: "dashboard", params: {} };
  if (path === "/worlds") return { section: "worlds", params: {} };
  if (path.startsWith("/world-agent/"))
    return { section: "world-agent", params: { worldId: path.split("/")[2] } };
  if (path.startsWith("/world/"))
    return { section: "editor", params: { worldId: path.split("/")[2] } };
  if (path === "/studio") return { section: "studio", params: {} };
  if (path === "/characters") return { section: "characters", params: {} };
  if (path === "/files") return { section: "files", params: {} };
  if (path === "/pipeline") return { section: "pipeline", params: {} };
  if (path === "/training") return { section: "training", params: {} };
  if (path === "/storyboard") return { section: "storyboard", params: {} };
  if (path.startsWith("/storyboard/")) {
    return { section: "storyboard-project", params: { projectId: path.split("/")[2] } };
  }
  return { section: "landing", params: {} };
}

const initial = parseRoute(window.location.pathname);

export const appStore = proxy({
  section: initial.section,
  params: initial.params,
  sidebarCollapsed: initial.section === "editor",
});

export const navigate = (path) => {
  const parsed = parseRoute(path);
  appStore.section = parsed.section;
  appStore.params = parsed.params;
  // Only force-collapse for full-screen editor; otherwise keep current state
  if (parsed.section === "editor") appStore.sidebarCollapsed = true;
  window.history.pushState(null, "", path);
};

window.addEventListener("popstate", () => {
  const parsed = parseRoute(window.location.pathname);
  appStore.section = parsed.section;
  appStore.params = parsed.params;
  if (parsed.section === "editor") appStore.sidebarCollapsed = true;
});
