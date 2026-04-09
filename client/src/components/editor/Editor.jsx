import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { worldStore, saveCurrentWorld } from "../../stores/worldStore";
import { editorStore, loadWorldIntoEditor, getEditorData } from "../../stores/editorStore";
import { Scene } from "./Scene";
import { Toolbar } from "./Toolbar";
import { ScenePanel } from "./ScenePanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AIPanel } from "./AIPanel";
import { AudioPanel } from "./AudioPanel";
import { AudioPlayer } from "./AudioPlayer";
import { CharacterCreator } from "./CharacterCreator";

export function Editor() {
  const worldSnap = useSnapshot(worldStore);
  const snap = useSnapshot(editorStore);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);

  const world = worldSnap.worlds.find((w) => w.id === worldSnap.currentWorldId);

  useEffect(() => {
    if (world) {
      loadWorldIntoEditor(world);
    }
  }, [worldSnap.currentWorldId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (worldStore.currentWorldId) {
        saveCurrentWorld(getEditorData());
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (worldStore.currentWorldId) {
        saveCurrentWorld(getEditorData());
      }
    };
  }, []);

  if (!world) return null;

  const showRightPanel = !snap.isPlaying && (snap.showAIPanel || snap.selectedId);

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "var(--border)" }}>
      <Toolbar onCreateCharacter={() => setShowCharacterCreator(true)} />

      <div className="flex-1 flex min-h-0">
        {!snap.isPlaying && <ScenePanel />}

        <div className="flex-1 relative min-w-0">
          <Scene />
          <AudioPanel />

          {snap.isPlaying && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--border)]/80 backdrop-blur-sm border border-[var(--border)] rounded-full px-5 py-2 flex items-center gap-3" style={{ boxShadow: "var(--neu-shadow)" }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[var(--text)] text-xs font-medium">Playing</span>
              <span className="text-[var(--text-muted)] text-xs">{snap.objects.filter((o) => o.animation !== "none").length} animated</span>
            </div>
          )}
        </div>

        {showRightPanel && (
          <div className="w-64 border-l border-[var(--border)] flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--border)" }}>
            {snap.selectedId && <PropertiesPanel />}
            {snap.showAIPanel && <AIPanel />}
          </div>
        )}
      </div>

      {/* Always-mounted audio player for play mode */}
      <AudioPlayer />

      <CharacterCreator open={showCharacterCreator} onClose={() => setShowCharacterCreator(false)} />
    </div>
  );
}
