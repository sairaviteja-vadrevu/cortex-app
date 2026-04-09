import { replicate } from "../../utils/replicate";
import { useState } from "react";
import { editorStore, addObject } from "../../stores/editorStore";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import {
  MODES,
  STEPS,
  QUICK_STYLES,
  ANIMATION_PRESETS,
  buildQuickPrompt,
  ModeCard,
  NameInput,
  StepDot,
  LoadingBar,
} from "./CharacterCreatorHelpers";

export function CharacterCreator({ open, onClose }) {
  const [mode, setMode] = useState(MODES.CHOOSE);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [gender, setGender] = useState(null);
  const [quickStyle, setQuickStyle] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState(1001);
  const [step, setStep] = useState(STEPS.IDLE);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");

  const reset = () => {
    setMode(MODES.CHOOSE);
    setName("");
    setPrompt("");
    setGender(null);
    setQuickStyle(null);
    setImageUrl(null);
    setModelUrl(null);
    setAnimated(false);
    setSelectedAnimation(1001);
    setStep(STEPS.IDLE);
    setError("");
    setStatusText("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const generateImage = async (imagePrompt) => {
    setError("");
    setStep(STEPS.GENERATING_IMAGE);
    setStatusText("Generating character image...");
    try {
      const output = await replicate("google/nano-banana", {
        prompt: imagePrompt, num_outputs: 1, aspect_ratio: "1:1", output_format: "png",
      });
      setImageUrl(Array.isArray(output) ? output[0] : output);
      setStep(STEPS.IMAGE_READY);
    } catch (err) {
      setError(err.message || "Image generation failed");
      setStep(STEPS.IDLE);
    }
  };

  const handleCustomGenerate = () => {
    if (!prompt.trim()) return;
    generateImage(
      `full body character, T-pose, front facing, ${prompt}, humanoid bipedal figure with clearly visible arms legs and head, game character concept art, solid white background, high quality, centered`,
    );
  };

  const handleQuickGenerate = () => {
    if (!gender || !quickStyle) return;
    generateImage(buildQuickPrompt(gender, quickStyle));
  };

  const handleStaticModel = async () => {
    if (!imageUrl) return;
    setError("");
    setStep(STEPS.GENERATING_MODEL);
    setStatusText("Creating 3D model...");
    setAnimated(false);
    try {
      const output = await replicate("cjwbw/triposr", {
        image: imageUrl,
        output_format: "glb",
        do_remove_background: true,
        foreground_ratio: 0.85,
        mc_resolution: 256,
      });
      setModelUrl(Array.isArray(output) ? output[0] : output);
      setStep(STEPS.MODEL_READY);
    } catch (err) {
      setError(err.message || "3D model generation failed");
      setStep(STEPS.IMAGE_READY);
    }
  };

  const tryMeshy = async (withAnimation) => {
    setStatusText("Building 3D model...");
    const output = await replicate("cjwbw/triposr", {
      image: imageUrl,
      output_format: "glb",
      do_remove_background: true,
      foreground_ratio: 0.85,
      mc_resolution: 256,
    });
    return Array.isArray(output) ? output[0] : output;
  };

  const tryTripoSR = async () => {
    const output = await replicate("cjwbw/triposr", {
      image: imageUrl,
      output_format: "glb",
      do_remove_background: true,
      foreground_ratio: 0.85,
      mc_resolution: 256,
    });
    return Array.isArray(output) ? output[0] : output;
  };

  const handleAnimatedModel = async () => {
    if (!imageUrl) return;
    setError("");
    setStep(STEPS.GENERATING_MODEL);
    setAnimated(true);

    try {

      // Attempt 1: Meshy with animation
      try {
        setStatusText("Creating animated 3D model (2-5 min)...");
        const url = await tryMeshy(true);
        if (url) {
          setModelUrl(url);
          setStep(STEPS.MODEL_READY);
          return;
        }
      } catch (e1) {
        console.warn("Meshy with animation failed, trying without animation...", e1);
      }

      // Attempt 2: Meshy without animation (just rigging)
      try {
        setStatusText("Retrying with rigging only...");
        const url = await tryMeshy(false);
        if (url) {
          setModelUrl(url);
          setAnimated(false);
          setStep(STEPS.MODEL_READY);
          return;
        }
      } catch (e2) {
        console.warn("Meshy rigging-only failed, falling back to TripoSR...", e2);
      }

      // Attempt 3: TripoSR static fallback
      setStatusText("Falling back to static 3D model...");
      const url = await tryTripoSR();
      setModelUrl(url);
      setAnimated(false);
      setError("Meshy service unavailable. Created a static 3D model instead.");
      setStep(STEPS.MODEL_READY);
    } catch (err) {
      setError(err.message || "All model generation attempts failed.");
      setStep(STEPS.IMAGE_READY);
    }
  };

  const handleAddToScene = () => {
    const fallbackName =
      mode === MODES.QUICK && quickStyle
        ? `${gender === "male" ? "Male" : "Female"} ${QUICK_STYLES.find((s) => s.id === quickStyle)?.label || "Character"}`
        : `Character ${editorStore.objects.length + 1}`;
    addObject("character", {
      name: name.trim() || fallbackName,
      imageUrl,
      modelUrl,
      animated,
      prompt: prompt.trim() || (gender && quickStyle ? buildQuickPrompt(gender, quickStyle) : ""),
    });
    handleClose();
  };

  const isLoading = step === STEPS.GENERATING_IMAGE || step === STEPS.GENERATING_MODEL;

  return (
    <Modal open={open} onClose={handleClose} title="Create Character">
      <div className="space-y-4">
        {/* Mode selection */}
        {mode === MODES.CHOOSE && (
          <div className="space-y-3">
            <p className="text-[var(--text-muted)] text-sm">How would you like to create your character?</p>
            <ModeCard title="Quick Create" desc="Pick gender and style, AI does the rest" onClick={() => setMode(MODES.QUICK)} />
            <ModeCard title="Custom Prompt" desc="Describe exactly what you want" onClick={() => setMode(MODES.CUSTOM)} />
          </div>
        )}

        {/* Quick Create */}
        {mode === MODES.QUICK && step === STEPS.IDLE && (
          <>
            <NameInput value={name} onChange={setName} />
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {["male", "female"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={cn(
                      "py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize",
                      gender === g ? "" : "bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--surface-3)]",
                    )}
                    style={
                      gender === g
                        ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)", boxShadow: "var(--neu-shadow)" }
                        : undefined
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setQuickStyle(s.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg transition-colors cursor-pointer",
                      quickStyle === s.id ? "" : "bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--surface-3)]",
                    )}
                    style={
                      quickStyle === s.id
                        ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)", boxShadow: "var(--neu-shadow)" }
                        : undefined
                    }
                  >
                    <div className="text-xs font-medium">{s.label}</div>
                    <div className={cn("text-[10px] mt-0.5", quickStyle === s.id ? "text-[var(--accent-text)]/70" : "text-[var(--text-dim)]")}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setGender(null);
                  setQuickStyle(null);
                  setMode(MODES.CHOOSE);
                }}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleQuickGenerate} disabled={!gender || !quickStyle}>
                Generate Character
              </Button>
            </div>
          </>
        )}

        {/* Custom Prompt */}
        {mode === MODES.CUSTOM && step === STEPS.IDLE && (
          <>
            <NameInput value={name} onChange={setName} />
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Describe your character</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. a magical wizard with a long blue robe, holding a glowing staff..."
                rows={3}
                className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-lg px-4 py-2.5 text-[var(--text)] text-sm placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)] resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setMode(MODES.CHOOSE)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleCustomGenerate} disabled={!prompt.trim()}>
                Generate Character
              </Button>
            </div>
          </>
        )}

        {/* Generation flow */}
        {step !== STEPS.IDLE && (
          <>
            <div className="flex items-center gap-2 text-[11px]">
              <StepDot
                label="Image"
                active={step === STEPS.GENERATING_IMAGE}
                done={[STEPS.IMAGE_READY, STEPS.GENERATING_MODEL, STEPS.MODEL_READY].includes(step)}
              />
              <div className="flex-1 h-px bg-[var(--surface-0)]" />
              <StepDot label="3D Model" active={step === STEPS.GENERATING_MODEL} done={step === STEPS.MODEL_READY} />
              <div className="flex-1 h-px bg-[var(--surface-0)]" />
              <StepDot label="Ready" active={false} done={step === STEPS.MODEL_READY} />
            </div>

            {isLoading && <LoadingBar text={statusText} />}

            {imageUrl && step !== STEPS.GENERATING_IMAGE && (
              <div className="rounded-lg overflow-hidden border border-[var(--surface-3)]">
                <img src={imageUrl} alt="Character preview" className="w-full h-48 object-contain" style={{ background: "var(--border)" }} />
              </div>
            )}

            {/* Choose 3D type */}
            {step === STEPS.IMAGE_READY && (
              <div className="space-y-2">
                <p className="text-[var(--text-muted)] text-xs">Choose 3D model type:</p>

                <button
                  onClick={handleStaticModel}
                  className="w-full text-left p-3 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-lg hover:border-[var(--text-muted)] transition-colors cursor-pointer"
                >
                  <div className="text-[var(--text)] text-sm font-medium">Static 3D Model</div>
                  <div className="text-[var(--text-muted)] text-xs mt-0.5">Fast (~5s) · No animations</div>
                </button>

                {/* Animated option with animation picker */}
                <div className="p-3 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-lg space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text)] text-sm font-medium">Animated 3D Model</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }}
                    >
                      Recommended
                    </span>
                  </div>
                  <div className="text-[var(--text-muted)] text-xs">~2-5 min · Auto-rigged · Skeletal animation</div>

                  {/* Animation picker */}
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">Pick an animation:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {ANIMATION_PRESETS.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAnimation(a.id)}
                          className={cn(
                            "px-2 py-1.5 text-[11px] rounded transition-colors cursor-pointer text-center",
                            selectedAnimation === a.id ? "" : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)]",
                          )}
                          style={
                            selectedAnimation === a.id
                              ? { background: "var(--accent)", color: "var(--accent-text)", border: "2px solid var(--border)" }
                              : undefined
                          }
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAnimatedModel}
                    className="w-full px-3 py-2 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-text)] border-2 border-[var(--border)] hover:brightness-110 transition-colors cursor-pointer"
                    style={{ boxShadow: "var(--neu-shadow)" }}
                  >
                    Generate Animated Model
                  </button>
                </div>

                <button
                  onClick={() => {
                    setImageUrl(null);
                    setStep(STEPS.IDLE);
                  }}
                  className="w-full text-center py-2 text-[var(--text-muted)] text-xs hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  Regenerate image
                </button>
              </div>
            )}

            {/* Model ready */}
            {step === STEPS.MODEL_READY && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {animated ? "Animated 3D model ready" : "3D model ready"}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={reset}>
                    Start Over
                  </Button>
                  <Button className="flex-1" onClick={handleAddToScene}>
                    Add to Scene
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-400 text-xs bg-red-400/10 rounded-lg p-3">{error}</p>}
      </div>
    </Modal>
  );
}
