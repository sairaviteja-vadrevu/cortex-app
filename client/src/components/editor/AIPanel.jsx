import { replicate } from "../../utils/replicate";
import { useState } from "react";
import { useSnapshot } from "valtio";
import { editorStore } from "../../stores/editorStore";

const skyPresets = ["sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio", "city", "park", "lobby"];

export function AIPanel() {
  const snap = useSnapshot(editorStore);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("background");

  if (!snap.showAIPanel) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    try {
      const output = await replicate("google/nano-banana", {
        prompt:
          mode === "background"
            ? `panoramic landscape environment, ${prompt}, highly detailed, 8k, cinematic lighting`
            : `seamless tileable texture, ${prompt}, highly detailed, photorealistic`,
        num_outputs: 1,
        aspect_ratio: mode === "background" ? "16:9" : "1:1",
        output_format: "png",
      });

      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (mode === "background") {
        editorStore.background = { type: "image", url: imageUrl };
      } else if (snap.selectedId) {
        const obj = editorStore.objects.find((o) => o.id === snap.selectedId);
        if (obj) obj.textureUrl = imageUrl;
      }

      setPrompt("");
    } catch (err) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">AI Studio</h3>
        <button
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          onClick={() => {
            editorStore.showAIPanel = false;
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Mode */}
        <div className="flex gap-px bg-[var(--surface-0)] rounded-md p-px">
          <button
            className={`flex-1 px-2 py-1.5 text-[11px] rounded transition-colors cursor-pointer ${
              mode === "background" ? "" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            style={
              mode === "background"
                ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }
                : undefined
            }
            onClick={() => setMode("background")}
          >
            Background
          </button>
          <button
            className={`flex-1 px-2 py-1.5 text-[11px] rounded transition-colors cursor-pointer ${
              mode === "texture" ? "" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            style={
              mode === "texture"
                ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }
                : undefined
            }
            onClick={() => setMode("texture")}
          >
            Texture
          </button>
        </div>

        {/* Sky presets */}
        {mode === "background" && (
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Presets</label>
            <div className="grid grid-cols-2 gap-1">
              {skyPresets.map((preset) => (
                <button
                  key={preset}
                  className={`px-2 py-1.5 text-[11px] rounded transition-colors cursor-pointer capitalize ${
                    snap.background.type === "sky" && snap.background.preset === preset
                      ? ""
                      : "bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  style={
                    snap.background.type === "sky" && snap.background.preset === preset
                      ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }
                      : undefined
                  }
                  onClick={() => {
                    editorStore.background = { type: "sky", preset };
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI prompt */}
        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Generate with AI</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === "background" ? "Describe the environment..." : "Describe the texture..."}
            rows={2}
            className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-md px-2.5 py-2 text-xs text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full mt-1.5 px-3 py-2 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-text)] border-2 border-[var(--border)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            style={{ boxShadow: "var(--neu-shadow)" }}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        {error && <p className="text-red-400 text-[11px] bg-red-400/10 rounded-md p-2">{error}</p>}

        {mode === "texture" && !snap.selectedId && <p className="text-[var(--text-muted)] text-[11px]">Select an object to apply a texture</p>}

        {/* Color bg */}
        {mode === "background" && (
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Solid Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={snap.background.type === "color" ? snap.background.value : "#1a1a2e"}
                onChange={(e) => {
                  editorStore.background = {
                    type: "color",
                    value: e.target.value,
                  };
                }}
                className="w-7 h-7 rounded cursor-pointer border border-[var(--surface-3)] bg-transparent"
              />
              <button
                className="px-3 py-1.5 text-[11px] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)] rounded-md transition-colors cursor-pointer"
                onClick={() => {
                  editorStore.background = {
                    type: "color",
                    value: "#1a1a2e",
                  };
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
