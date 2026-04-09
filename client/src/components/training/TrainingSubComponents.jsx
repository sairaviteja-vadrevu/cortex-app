import { useState, useMemo } from "react";
import {
  TRAINING_PRESETS,
  TRAINING_STEPS,
  removeJob,
  testLoRA,
} from "../../stores/loraStore";
import { navigate } from "../../stores/appStore";
import { Button } from "../ui/Button";
import { cardStyle, inputStyle, statusDone } from "../../utils/theme";
import { STATUS_COLORS, STATUS_LABELS, PRESET_ACCENT, PRESET_ICONS } from "./trainingConstants";

export function StepTracker({ currentStep }) {
  const currentIdx = TRAINING_STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "14px 0 6px" }}>
      {TRAINING_STEPS.map((step, i) => {
        const isDone = i < currentIdx || currentStep === "done";
        const isActive = i === currentIdx && currentStep !== "done";
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < TRAINING_STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 24 }}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isDone ? statusDone : isActive ? "var(--accent-tertiary)" : "var(--surface-2)",
                  border: isActive ? "2px solid #818cf8" : "2px solid transparent",
                  transition: "all 0.3s",
                  animation: isActive ? "pulse 2s infinite" : "none",
                }}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: isActive ? "#fff" : "var(--text-dim)" }} />
                )}
              </div>
              <span style={{ fontSize: 9, marginTop: 4, whiteSpace: "nowrap", color: isDone ? statusDone : isActive ? "#a5b4fc" : "var(--text-dim)" }}>
                {step.label}
              </span>
            </div>
            {i < TRAINING_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 16,
                backgroundColor: i < currentIdx ? statusDone : "var(--surface-2)",
                transition: "background-color 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
export function ImagePreviewGrid({ files, onRemove }) {
  const previews = useMemo(() => {
    if (!files?.length) return [];
    return Array.from(files).map((f, i) => ({ id: i, name: f.name, url: URL.createObjectURL(f) }));
  }, [files]);

  if (!previews.length) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6 }}>
        {previews.map((p) => (
          <div
            key={p.id}
            className="group"
            style={{
              position: "relative", borderRadius: 6, overflow: "hidden",
              border: "2px solid var(--surface-3)",
              aspectRatio: "1",
            }}
          >
            <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{
                  position: "absolute", top: 2, right: 2,
                  width: 16, height: 16, borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.75)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export function PresetPicker({ selected, onSelect }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {TRAINING_PRESETS.map((preset) => {
          const isActive = selected === preset.id;
          const accent = PRESET_ACCENT[preset.id];
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(isActive ? null : preset.id)}
              className="text-left transition-all cursor-pointer"
              style={{
                background: isActive
                  ? `linear-gradient(180deg, ${accent.bg} 0%, var(--surface-0) 100%)`
                  : "var(--surface-1)",
                border: isActive
                  ? `2px solid ${accent.border}`
                  : "2px solid var(--surface-3)",
                borderRadius: 10,
                padding: "14px 14px 12px",
                boxShadow: isActive
                  ? `0 0 24px -6px ${accent.border}, 4px 4px 0px var(--border)`
                  : "var(--neu-shadow)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isActive ? accent.bg : "var(--surface-2)",
                    border: `1px solid ${isActive ? accent.border : "var(--surface-3)"}`,
                  }}
                >
                  <span style={{ color: isActive ? accent.color : "var(--text-dim)" }}>{PRESET_ICONS[preset.icon]}</span>
                </div>
                {isActive && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent.color} strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="block font-medium" style={{ fontSize: 13, color: isActive ? "var(--text)" : "var(--text)", marginBottom: 3 }}>
                {preset.label}
              </span>
              <p style={{ fontSize: 11, lineHeight: 1.4, color: isActive ? "var(--text-muted)" : "var(--text-dim)", margin: 0 }}>
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function WhatsNextCards({ job }) {
  const accent = PRESET_ACCENT[job.preset] || PRESET_ACCENT.character;
  return (
    <div style={{
      marginTop: 14, padding: 16, borderRadius: 10,
      background: "var(--surface-1)",
      border: "2px solid var(--surface-3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h4 className="text-sm font-semibold" style={{ color: "var(--text)" }}>What's next?</h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div style={{ borderTop: "1px solid var(--surface-3)", paddingTop: 6, display: "flex", flexDirection: "column", gap: 1 }}>
        <NextOption
          label="Use in Image Studio"
          description="Generate images with your trained LoRA model"
          onClick={() => navigate("/studio")}
        />
        <NextOption
          label="Test with prompts"
          description="Try different prompts to evaluate quality"
          onClick={() => {
            const el = document.getElementById(`test-section-${job.id}`);
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />
        <NextOption
          label="Train another variant"
          description="New job with different settings or images"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
        <NextOption
          label="Use in Pipeline"
          description="Add this LoRA to your agentic pipeline"
          onClick={() => navigate("/pipeline")}
        />
        <NextOption
          label="Download weights"
          description={`Save ${job.name || "LoRA"} weights locally`}
          onClick={() => {
            if (job.loraFileUrl) {
              const a = document.createElement("a");
              a.href = job.loraFileUrl;
              a.download = `${job.name || "lora"}-weights.safetensors`;
              a.click();
            }
          }}
          disabled={!job.loraFileUrl}
        />
      </div>
    </div>
  );
}

export function NextOption({ label, description, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ background: "none", border: "none", padding: "9px 10px", borderRadius: 8 }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = "var(--surface-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span className="text-[13px] font-medium block" style={{ color: "var(--text)" }}>{label}</span>
      <span style={{ fontSize: 11, marginTop: 1, color: "var(--text-dim)", display: "block" }}>{description}</span>
    </button>
  );
}
export function JobCard({ job, onDownload }) {
  const jobAccent = PRESET_ACCENT[job.preset] || PRESET_ACCENT.character;
  const isActive = job.status === "training" || job.status === "uploading" || job.status === "preprocessing" || job.status === "validating";
  return (
    <div style={{
      ...cardStyle, padding: 18,
      borderColor: isActive ? jobAccent.border : "var(--border)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: STATUS_COLORS[job.status],
            boxShadow: isActive ? `0 0 10px ${STATUS_COLORS[job.status]}` : "none",
            animation: isActive ? "pulse 2s infinite" : "none",
          }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{job.name}</h3>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>{job.modelLabel}</span>
          {job.preset && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              padding: "1px 6px", borderRadius: 4,
              backgroundColor: jobAccent.bg,
              color: jobAccent.color,
              border: `1px solid ${jobAccent.border}`,
            }}>
              {TRAINING_PRESETS.find((p) => p.id === job.preset)?.label || job.preset}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="text-xs font-medium" style={{ color: STATUS_COLORS[job.status] }}>
            {STATUS_LABELS[job.status]}
          </span>
          {!isActive && (
            <button
              onClick={() => removeJob(job.id)}
              className="transition-colors cursor-pointer"
              style={{ background: "none", border: "none", padding: 2, color: "var(--surface-3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Details row */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 2 }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{job.imageCount} images</span>
        {job.triggerWord && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Trigger: <span className="font-mono" style={{ color: "var(--text)" }}>{job.triggerWord}</span>
          </span>
        )}
        {job.trainingStyle && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Type: <span className="capitalize" style={{ color: "var(--text)" }}>{job.trainingStyle}</span>
          </span>
        )}
        {job.autoCaption && <span className="text-xs" style={{ color: "var(--text-dim)" }}>Auto-captioned</span>}
        <span className="text-xs" style={{ color: "var(--surface-3)" }}>{new Date(job.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Training image thumbnails */}
      {job.thumbnails?.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {job.thumbnails.map((thumb, i) => (
            <div key={i} style={{
              width: 44, height: 44, borderRadius: 6, overflow: "hidden",
              border: "2px solid var(--surface-3)",
            }}>
              <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
          {job.imageCount > 6 && (
            <div style={{
              width: 44, height: 44, borderRadius: 6,
              border: "2px solid var(--surface-3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "var(--surface-2)",
            }}>
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>+{job.imageCount - 6}</span>
            </div>
          )}
        </div>
      )}

      {/* Step Progress Tracker */}
      {job.currentStep && job.status !== "done" && job.status !== "error" && job.status !== "idle" && (
        <StepTracker currentStep={job.currentStep} />
      )}

      {/* Progress log */}
      {isActive && job.progress && (
        <div style={{ padding: "8px 10px", borderRadius: 6, backgroundColor: "rgba(108,99,255,0.08)", marginTop: 8 }}>
          <p className="text-xs font-mono" style={{ color: "#818cf8" }}>{job.progress}</p>
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div style={{ padding: "8px 10px", borderRadius: 6, backgroundColor: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", marginTop: 8 }}>
          <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>{job.error}</p>
        </div>
      )}

      {/* Done state */}
      {job.status === "done" && (
        <>
          <StepTracker currentStep="done" />

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {job.loraFileUrl && (
              <Button variant="secondary" size="sm" onClick={() => onDownload(job.loraFileUrl, `${job.name || "lora"}-weights.safetensors`)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                LoRA Weights
              </Button>
            )}
            {job.configFileUrl && (
              <Button variant="secondary" size="sm" onClick={() => onDownload(job.configFileUrl, `${job.name || "lora"}-config.json`)}>
                Config
              </Button>
            )}
          </div>

          <TestLoRASection job={job} />
          <WhatsNextCards job={job} />
        </>
      )}
    </div>
  );
}

export function TestLoRASection({ job }) {
  const [testPrompt, setTestPrompt] = useState("");
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!testPrompt.trim() || testing) return;
    setTesting(true);
    try {
      await testLoRA(job.id, testPrompt.trim());
      setTestPrompt("");
    } finally {
      setTesting(false);
    }
  };

  const accent = PRESET_ACCENT[job.preset] || PRESET_ACCENT.character;

  return (
    <div
      id={`test-section-${job.id}`}
      style={{
        marginTop: 14, padding: 14, borderRadius: 10,
        backgroundColor: accent.bg,
        border: `2px solid ${accent.border}`,
      }}
    >
      <h4 style={{ fontSize: 12, fontWeight: 600, color: accent.color, marginBottom: 10 }}>
        Test Your LoRA
      </h4>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleTest(); }}
          placeholder={`A portrait of ${job.triggerWord || "subject"} in a forest...`}
          style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "8px 12px" }}
        />
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={!testPrompt.trim() || testing}>
          {testing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          ) : "Generate"}
        </Button>
      </div>
      {job.triggerWord && (
        <p style={{ fontSize: 10, marginTop: 6, color: "var(--text-dim)" }}>
          Trigger word <span className="font-mono" style={{ color: accent.color }}>"{job.triggerWord}"</span> will be appended automatically
        </p>
      )}

      {job.testImages?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginTop: 12 }}>
          {job.testImages.map((img) => (
            <div key={img.id} style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ aspectRatio: "1", backgroundColor: "var(--surface-0)", position: "relative" }}>
                {img.status === "generating" ? (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: accent.color }}>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : img.imageUrl ? (
                  <img src={img.imageUrl} alt={img.prompt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="1.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </div>
                )}
              </div>
              <div style={{ padding: 6 }}>
                <p className="truncate" style={{ fontSize: 10, color: "var(--text-dim)" }}>{img.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
