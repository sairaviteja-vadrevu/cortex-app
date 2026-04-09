import { replicate } from "../../utils/replicate";
import { useState } from "react";
import { useSnapshot } from "valtio";
import {
  studioStore,
  addGeneration,
  updateGeneration,
} from "../../stores/studioStore";
import { addAsset } from "../../stores/assetStore";
import { Button } from "../ui/Button";
import { Tabs } from "../ui/Tabs";
import { cardStyle, inputStyle, panelStyle, pagePadding, gridCols } from "../../utils/theme";
import { VTronTab } from "./VTronTab";

const IMAGE_SIZES = [
  { label: "Landscape 16:9", value: "landscape_16_9" },
  { label: "Portrait 4:3", value: "portrait_4_3" },
  { label: "Square", value: "square_hd" },
  { label: "Landscape 4:3", value: "landscape_4_3" },
];

const COUNT_OPTIONS = [1, 2, 4, 8];

const STUDIO_TABS = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "vtron", label: "V-Tron" },
];

export function ImageStudio() {
  const snap = useSnapshot(studioStore);
  const [tab, setTab] = useState("image");

  // Image state
  const [prompt, setPrompt] = useState("");
  const [selectedSize, setSelectedSize] = useState("landscape_16_9");
  const [generating, setGenerating] = useState(false);
  const [imageCount, setImageCount] = useState(1);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoError, setVideoError] = useState("");

  const getAspectRatio = () =>
    selectedSize === "landscape_16_9" ? "16:9"
    : selectedSize === "portrait_4_3" ? "3:4"
    : selectedSize === "square_hd" ? "1:1"
    : selectedSize === "landscape_4_3" ? "4:3"
    : "16:9";

  const generateOne = async (promptText, aspectRatio) => {
    const genId = addGeneration({ prompt: promptText, imageSize: selectedSize });
    try {
      const output = await replicate("google/nano-banana", {
        prompt: promptText, num_outputs: 1, aspect_ratio: aspectRatio, output_format: "png",
      });
      updateGeneration(genId, { imageUrl: Array.isArray(output) ? output[0] : output, status: "complete" });
    } catch (err) {
      console.error("Generation failed:", err);
      updateGeneration(genId, { status: "failed" });
    }
  };

  const handleGenerate = async () => {
    if (generating || !prompt.trim()) return;

    const prompts = [];
    for (let i = 0; i < imageCount; i++) prompts.push(prompt.trim());

    setGenerating(true);
    const aspectRatio = getAspectRatio();

    const BATCH = 3;
    for (let i = 0; i < prompts.length; i += BATCH) {
      const batch = prompts.slice(i, i + BATCH);
      await Promise.all(batch.map((p) => generateOne(p, aspectRatio)));
    }

    setPrompt("");
    setGenerating(false);
  };

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim() || videoGenerating) return;
    setVideoGenerating(true);
    setVideoError("");
    setVideoUrl(null);

    try {
      const imgOutput = await replicate("google/nano-banana", {
        prompt: videoPrompt.trim(), num_outputs: 1, aspect_ratio: "16:9", output_format: "png",
      });
      const imageUrl = Array.isArray(imgOutput) ? imgOutput[0] : imgOutput;

      const vidOutput = await replicate("minimax/video-01-live", {
        prompt: videoPrompt.trim(),
        first_frame_image: imageUrl,
      });
      setVideoUrl(Array.isArray(vidOutput) ? vidOutput[0] : vidOutput);
    } catch (err) {
      console.error("Video generation failed:", err);
      setVideoError(err.message || "Video generation failed. Try again.");
    } finally {
      setVideoGenerating(false);
    }
  };

  const handleSaveToAssets = (gen) => {
    addAsset({
      name: gen.prompt.slice(0, 60) || "AI Generated Image",
      type: "image",
      url: gen.imageUrl,
      thumbnail: gen.imageUrl,
      source: "ai-generated",
    });
  };

  const imageGens = snap.generations.filter((g) => g.status !== "failed");

  return (
    <div className="flex-1 overflow-auto">
      <div style={pagePadding}>
        {/* Header provided by PageHeader */}

        <div style={{ marginBottom: 32 }}>
          <Tabs tabs={STUDIO_TABS} active={tab} onChange={setTab} />
        </div>

        {/* ── Image Tab ── */}
        {tab === "image" && (
          <>
            <section style={{ ...panelStyle, padding: 20, marginBottom: 32 }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                placeholder="Describe the image you want to generate..."
                className="text-sm focus:outline-none resize-none"
                style={{ ...inputStyle, padding: "12px 16px", fontSize: 14, color: "var(--text)" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 500 }}>Count:</span>
                {COUNT_OPTIONS.map((c) => (
                  <button key={c} onClick={() => setImageCount(c)} style={{ width: 32, height: 28, borderRadius: 6, fontSize: 12, fontWeight: imageCount === c ? 700 : 400, border: imageCount === c ? "2px solid var(--border)" : "2px solid var(--surface-3)", background: imageCount === c ? "var(--accent-tertiary)" : "var(--surface-0)", color: imageCount === c ? "var(--text)" : "var(--text-muted)", cursor: "pointer", boxShadow: imageCount === c ? "var(--neu-shadow-sm)" : "none", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {IMAGE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setSelectedSize(size.value)}
                      className="transition-all cursor-pointer"
                      style={{
                        padding: "6px 12px", fontSize: 12, borderRadius: 6,
                        border: selectedSize === size.value ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                        backgroundColor: selectedSize === size.value ? "var(--accent)" : "var(--surface-0)",
                        color: selectedSize === size.value ? "var(--accent-text)" : "var(--text-muted)",
                        fontWeight: selectedSize === size.value ? 600 : 400,
                        boxShadow: selectedSize === size.value ? "var(--neu-shadow-sm)" : "none",
                      }}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
                <Button onClick={handleGenerate} disabled={!prompt.trim() || generating}>
                  {generating ? "Generating..." : imageCount > 1 ? `Generate ${imageCount} Images` : "Generate"}
                </Button>
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 12 }}>
                Press Cmd+Enter to generate
              </p>
            </section>

            <section>
              <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", marginBottom: 12 }}>Generations</h2>
              {imageGens.length === 0 ? (
                <div style={{ padding: "48px 0", textAlign: "center" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="var(--surface-3)" style={{ margin: "0 auto 12px" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  <p style={{ color: "var(--text-dim)", fontSize: 14 }}>No images yet. Write a prompt above.</p>
                </div>
              ) : (
                <div style={gridCols(250)}>
                  {imageGens.map((gen) => (
                    <div key={gen.id} style={{ ...cardStyle, overflow: "hidden" }} className="group">
                      <div style={{ aspectRatio: "16/9", backgroundColor: "var(--surface-0)", position: "relative" }}>
                        {gen.status === "generating" ? (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: "var(--text)" }}>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : gen.imageUrl ? (
                          <>
                            <img src={gen.imageUrl} alt={gen.prompt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <Button variant="secondary" size="sm" onClick={() => handleSaveToAssets(gen)}>Save to Assets</Button>
                            </div>
                          </>
                        ) : null}
                      </div>
                      <div style={{ padding: 10 }}>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{gen.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Video Tab ── */}
        {tab === "video" && (
          <>
            <section style={{ ...panelStyle, padding: 20, marginBottom: 32 }}>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="text-sm focus:outline-none resize-none"
                style={{ ...inputStyle, padding: "12px 16px", fontSize: 14, color: "var(--text)" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11 }}>Generates a 5-second video from your prompt</p>
                <Button onClick={handleVideoGenerate} disabled={!videoPrompt.trim() || videoGenerating}>
                  {videoGenerating ? "Generating Video..." : "Generate Video"}
                </Button>
              </div>
            </section>

            {videoGenerating && (
              <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: "var(--text)", margin: "0 auto 12px" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Generating video... This can take 1-3 minutes.</p>
              </div>
            )}

            {videoError && (
              <div style={{ padding: 12, borderRadius: 8, backgroundColor: "rgba(255,107,107,0.12)", border: "2px solid var(--accent-secondary)", marginBottom: 16 }}>
                <p style={{ color: "var(--accent-secondary)", fontSize: 12 }}>{videoError}</p>
              </div>
            )}

            {videoUrl && (
              <div style={{ ...cardStyle, overflow: "hidden" }}>
                <video src={videoUrl} controls autoPlay loop style={{ width: "100%", maxHeight: 500, backgroundColor: "var(--border)" }} />
                <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{videoPrompt}</p>
                  <Button variant="secondary" size="sm" onClick={() => { addAsset({ name: videoPrompt.slice(0, 60) || "AI Video", type: "video", url: videoUrl, source: "ai-generated" }); }}>
                    Save to Assets
                  </Button>
                </div>
              </div>
            )}

            {!videoUrl && !videoGenerating && !videoError && (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="var(--surface-3)" style={{ margin: "0 auto 12px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <p style={{ color: "var(--text-dim)", fontSize: 14 }}>Describe a scene to generate a short video.</p>
              </div>
            )}
          </>
        )}

        {/* ── V-Tron Tab (Virtual Try-On) ── */}
        {tab === "vtron" && <VTronTab />}
      </div>
    </div>
  );
}
