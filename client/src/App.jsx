import { useEffect, lazy, Suspense } from "react";
import { useSnapshot } from "valtio";
import { appStore, navigate } from "./stores/appStore";
import { authStore, signout } from "./stores/authStore";
import { apiFetch } from "./utils/api";
import { worldStore } from "./stores/worldStore";
import { AppShell } from "./components/layout/AppShell";
import { AuthPage } from "./components/auth/AuthPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Home } from "./components/home/Home";
import { Editor } from "./components/editor/Editor";
import { AgentWorldBuilder } from "./components/editor/AgentWorldBuilder";
import { ImageStudio } from "./components/studio/ImageStudio";
import { FileManager } from "./components/files/FileManager";
import { CharacterLibrary } from "./components/characters/CharacterLibrary";
import { LoraTraining } from "./components/training/LoraTraining";
import LandingPage from "./components/landing/LandingPage";
import { StoryboardProjects } from "./components/storyboard/StoryboardProjects";
import { ProjectView } from "./components/storyboard/ProjectView";

const AgenticPipeline = lazy(() => import("./components/pipeline/AgenticPipeline"));

function EditorWrapper() {
  const snap = useSnapshot(appStore);

  useEffect(() => {
    if (snap.params.worldId) {
      worldStore.currentWorldId = snap.params.worldId;
      worldStore.page = "editor";
    }
  }, [snap.params.worldId]);

  return <Editor />;
}

function AgentWorldBuilderWrapper() {
  const snap = useSnapshot(appStore);

  useEffect(() => {
    if (snap.params.worldId) {
      worldStore.currentWorldId = snap.params.worldId;
      worldStore.page = "editor";
    }
  }, [snap.params.worldId]);

  return <AgentWorldBuilder />;
}

function App() {
  const snap = useSnapshot(appStore);
  const auth = useSnapshot(authStore);

  // Verify token on mount — if user doesn't exist in DB, sign out
  useEffect(() => {
    if (!auth.token) return;
    apiFetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) signout();
      })
      .catch(() => signout());
  }, []);

  // If on landing page but logged in, redirect to dashboard
  if (snap.section === "landing" && auth.token) {
    navigate("/dashboard");
    return null;
  }

  // Landing page is always accessible
  if (snap.section === "landing") return <LandingPage />;

  // If not authenticated, show auth page
  if (!auth.token) return <AuthPage />;

  // Editor is full-screen, no shell
  if (snap.section === "editor") return <EditorWrapper />;

  // Agent world builder is full-screen, no shell
  if (snap.section === "world-agent") return <AgentWorldBuilderWrapper />;

  return (
    <AppShell>
      {snap.section === "dashboard" && <Dashboard />}
      {snap.section === "worlds" && <Home />}
      {snap.section === "studio" && <ImageStudio />}
      {snap.section === "characters" && <CharacterLibrary />}
      {snap.section === "training" && <LoraTraining />}
      {snap.section === "files" && <FileManager />}
      {snap.section === "storyboard" && <StoryboardProjects />}
      {snap.section === "storyboard-project" && <ProjectView />}
      {snap.section === "pipeline" && (
        <Suspense fallback={<div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>Loading pipeline...</div>}>
          <AgenticPipeline />
        </Suspense>
      )}
    </AppShell>
  );
}

export default App;
