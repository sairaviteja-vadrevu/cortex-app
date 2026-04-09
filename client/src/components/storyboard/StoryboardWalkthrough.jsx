import { useState } from "react";
import { Button } from "../ui/Button";
import { Clapperboard } from "lucide-react";

const STEPS = [
  {
    title: "Generate Character Images",
    tab: "characters",
    buttonLabel: "Go to Characters Tab",
    description: "Go to the Characters tab and click 'Generate Image' for each character. These portraits will be used as visual references when creating shot frames — ensuring your characters look consistent throughout the movie.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
      </svg>
    ),
  },
  {
    title: "Generate Location Images",
    tab: "locations",
    buttonLabel: "Go to Locations Tab",
    description: "Go to the Locations tab and generate images for each setting. These become the backdrop references for your storyboard shots.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    title: "Generate Shot Images & Videos",
    tab: "shots",
    buttonLabel: "Go to Shots Tab",
    description: "Go to the Shots tab. For each scene, click 'Generate All Images' first, then 'Generate All Videos'. Finally click 'Assemble Scene' to merge shot clips into one scene video.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Add Voiceover & Music",
    tab: "scenes",
    buttonLabel: "Go to Scenes Tab",
    description: "Go to the Scenes tab. Expand each scene and click 'Generate' for AI Voiceover (character dialogue) and Background Music. Then click 'Assemble' to merge audio with the scene video.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
    ),
  },
  {
    title: "Export Final Movie",
    tab: "export",
    buttonLabel: "Go to Export Tab",
    description: "Go to the Export tab. Once all scenes are assembled, click 'Assemble Final Movie' to merge everything into one video. Then download your movie!",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
];

export function StoryboardWalkthrough({ onNavigate, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div style={{ marginBottom: 24, borderRadius: 12, border: "3px solid var(--accent)", backgroundColor: "var(--surface-1)", boxShadow: "var(--neu-shadow)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid var(--surface-3)" }}>
        <div className="flex items-center gap-3">
          <Clapperboard size={20} style={{ color: "var(--accent)" }} />
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>How to Create Your Movie</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Follow these 5 steps to go from script to final movie</p>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 12, fontFamily: "inherit" }}>
          Dismiss
        </button>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", padding: "12px 20px", gap: 4 }}>
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            style={{
              flex: 1, height: 4, borderRadius: 2, border: "none", cursor: "pointer",
              backgroundColor: i <= currentStep ? "var(--accent)" : "var(--surface-3)",
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>

      {/* Current step */}
      <div style={{ padding: "12px 20px 20px" }}>
        <div className="flex items-start gap-4">
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            backgroundColor: "var(--surface-0)", border: "2px solid var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)",
          }}>
            {STEPS[currentStep].icon}
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent)" }}>Step {currentStep + 1} of {STEPS.length}</span>
            </div>
            <h4 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{STEPS[currentStep].title}</h4>
            <p className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{STEPS[currentStep].description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setCurrentStep(currentStep - 1)}>Previous</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onNavigate(STEPS[currentStep].tab)}>
              {STEPS[currentStep].buttonLabel}
            </Button>
            {currentStep < STEPS.length - 1 && (
              <Button variant="secondary" size="sm" onClick={() => setCurrentStep(currentStep + 1)}>Next Step</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
