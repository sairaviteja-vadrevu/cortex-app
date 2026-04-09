import { useState, useRef } from "react";
import { useSnapshot } from "valtio";
import {
  loraStore,
  TRAINING_MODELS,
  TRAINING_PRESETS,
  addJob,
  startTraining,
} from "../../stores/loraStore";
import { Button } from "../ui/Button";
import { inputStyle, panelStyle, pagePadding } from "../../utils/theme";
import { PRESET_ACCENT } from "./trainingConstants";
import {
  ImagePreviewGrid,
  PresetPicker,
  JobCard,
} from "./TrainingSubComponents";

// === MAIN COMPONENT ===
export function LoraTraining() {
  const snap = useSnapshot(loraStore);
  const fileRef = useRef(null);

  const [name, setName] = useState("");
  const [model, setModel] = useState(TRAINING_MODELS[0].id);
  const [triggerWord, setTriggerWord] = useState("");
  const [trainingStyle, setTrainingStyle] = useState("subject");
  const [steps, setSteps] = useState("");
  const [learningRate, setLearningRate] = useState("");
  const [autoCaption, setAutoCaption] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [creating, setCreating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedModel = TRAINING_MODELS.find((m) => m.id === model) || TRAINING_MODELS[0];

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId) {
      const preset = TRAINING_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setModel(preset.defaults.model);
        setTrainingStyle(preset.defaults.trainingStyle);
        setTriggerWord(preset.defaults.triggerWord);
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setSelectedFiles(Array.from(files));
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => {
      if (!prev) return null;
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : null;
    });
  };

  const handleCreate = async () => {
    if (!selectedFiles?.length || creating) return;
    setCreating(true);

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let i = 0; i < selectedFiles.length; i++) {
        zip.file(selectedFiles[i].name, selectedFiles[i]);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFile = new File([zipBlob], "training-images.zip", { type: "application/zip" });

      const thumbnails = [];
      for (let i = 0; i < Math.min(selectedFiles.length, 6); i++) {
        thumbnails.push(URL.createObjectURL(selectedFiles[i]));
      }

      const jobId = addJob({
        name: name || `LoRA ${new Date().toLocaleDateString()}`,
        model,
        modelLabel: selectedModel.label,
        triggerWord,
        trainingStyle,
        autoCaption,
        preset: selectedPreset,
        steps: steps ? parseInt(steps, 10) : null,
        learningRate: learningRate ? parseFloat(learningRate) : null,
        imageCount: selectedFiles.length,
        thumbnails,
      });

      setName("");
      setTriggerWord("");
      setSteps("");
      setLearningRate("");
      setSelectedFiles(null);
      setSelectedPreset(null);
      setShowAdvanced(false);
      if (fileRef.current) fileRef.current.value = "";

      startTraining(jobId, zipFile);
    } catch (err) {
      console.error("Failed to create training job:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const presetAccent = selectedPreset ? PRESET_ACCENT[selectedPreset] : null;

  return (
    <div className="flex-1 overflow-auto">
      <div style={pagePadding}>
        {/* Header provided by PageHeader */}

        {/* Preset Picker */}
        <PresetPicker selected={selectedPreset} onSelect={handlePresetSelect} />

        {/* New Training Job */}
        <section style={{
          ...panelStyle,
          padding: "20px 22px",
          marginBottom: 36,
          borderColor: presetAccent ? presetAccent.border : "var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>New Training Job</h2>
            {selectedPreset && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                padding: "2px 8px", borderRadius: 4,
                backgroundColor: presetAccent?.bg,
                color: presetAccent?.color,
                border: `1px solid ${presetAccent?.border}`,
              }}>
                {TRAINING_PRESETS.find((p) => p.id === selectedPreset)?.label}
              </span>
            )}
          </div>

          {/* Row 1: Name + Model */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My LoRA model"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Training Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TRAINING_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Trigger Word + Training Type (or full-width trigger) */}
          <div style={{ display: "grid", gridTemplateColumns: selectedModel.supportsStyle ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Trigger Word</label>
              <input
                type="text"
                value={triggerWord}
                onChange={(e) => setTriggerWord(e.target.value)}
                placeholder="e.g. ohwx, sks"
                style={inputStyle}
              />
            </div>

            {selectedModel.supportsStyle && (
              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Training Type</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["subject", "style"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTrainingStyle(s)}
                      className="transition-all cursor-pointer"
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: trainingStyle === s
                          ? "2px solid var(--border)"
                          : "2px solid var(--surface-3)",
                        backgroundColor: trainingStyle === s ? "var(--accent)" : "var(--surface-0)",
                        color: trainingStyle === s ? "var(--accent-text)" : "var(--text-muted)",
                        fontWeight: trainingStyle === s ? 600 : 400,
                        textTransform: "capitalize",
                        boxShadow: trainingStyle === s ? "var(--neu-shadow-sm)" : "none",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Options row: auto-caption + advanced toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingTop: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setAutoCaption(!autoCaption)}
                className="cursor-pointer"
                style={{
                  width: 34, height: 18, borderRadius: 9, border: "none",
                  backgroundColor: autoCaption ? "var(--accent-tertiary)" : "var(--surface-2)",
                  position: "relative", transition: "background-color 0.2s",
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", backgroundColor: "#fff",
                  position: "absolute", top: 2,
                  left: autoCaption ? 18 : 2,
                  transition: "left 0.2s",
                }} />
              </button>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Auto-caption images</span>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs transition-colors cursor-pointer"
              style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced
            </button>
          </div>

          {showAdvanced && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Steps <span style={{ color: "var(--surface-3)" }}>(optional)</span>
                </label>
                <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Auto" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Learning Rate <span style={{ color: "var(--surface-3)" }}>(optional)</span>
                </label>
                <input type="number" value={learningRate} onChange={(e) => setLearningRate(e.target.value)} placeholder="Auto" step="0.00001" style={inputStyle} />
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Training Images <span style={{ color: "var(--surface-3)" }}>(min {selectedModel.minImages})</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer transition-colors"
              style={{
                border: `3px dashed ${selectedFiles?.length ? "rgba(108,99,255,0.3)" : "var(--surface-3)"}`,
                borderRadius: 10,
                padding: selectedFiles?.length ? "10px 14px" : "20px 16px",
                textAlign: "center",
                backgroundColor: selectedFiles?.length ? "rgba(108,99,255,0.04)" : "transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = selectedFiles?.length ? "rgba(108,99,255,0.3)" : "var(--surface-3)"; }}
            >
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              {selectedFiles?.length ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-tertiary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: "var(--accent-tertiary)" }}>
                    {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""} selected
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>— click to add more</span>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drop images here or click to browse</p>
                </>
              )}
            </div>

            <ImagePreviewGrid files={selectedFiles} onRemove={handleRemoveFile} />
          </div>

          {/* Submit row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
            <p style={{ fontSize: 11, color: "var(--surface-3)" }}>
              Images will be zipped and uploaded to fal.ai for training.
            </p>
            <Button
              onClick={handleCreate}
              disabled={!selectedFiles?.length || selectedFiles.length < selectedModel.minImages || creating}
            >
              {creating ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
                  </svg>
                  Start Training
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Training Jobs */}
        <section>
          <h2 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", marginBottom: 14 }}>
            Training Jobs
          </h2>
          {snap.jobs.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="var(--surface-3)" style={{ margin: "0 auto 10px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.102c3.898 1.1 7.868 1.7 11.929 1.7s8.03-.6 11.929-1.7a23.54 23.54 0 0 0-2.688-6.102M12 2.25c-2.148 0-4.268.213-6.33.625a48.69 48.69 0 0 0-.672 2.832c2.258-.405 4.573-.625 6.942-.625s4.684.22 6.942.625a48.69 48.69 0 0 0-.672-2.832A49.39 49.39 0 0 0 12 2.25Z" />
              </svg>
              <p style={{ color: "var(--text-dim)", fontSize: 14 }}>No training jobs yet</p>
              <p className="text-xs" style={{ color: "var(--surface-3)", marginTop: 4 }}>Pick a preset above and add your images to get started</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {snap.jobs.map((job) => (
                <JobCard key={job.id} job={job} onDownload={handleDownload} />
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
