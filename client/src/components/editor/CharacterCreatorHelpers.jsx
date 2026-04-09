import { cn } from "../../utils/cn";

export const MODES = { CHOOSE: "choose", CUSTOM: "custom", QUICK: "quick" };

export const STEPS = {
  IDLE: "idle",
  GENERATING_IMAGE: "generating_image",
  IMAGE_READY: "image_ready",
  GENERATING_MODEL: "generating_model",
  MODEL_READY: "model_ready",
};

export const QUICK_STYLES = [
  { id: "warrior", label: "Warrior", desc: "Armored fighter with a sword" },
  { id: "mage", label: "Mage", desc: "Robed spellcaster with a staff" },
  { id: "archer", label: "Archer", desc: "Agile ranger with a bow" },
  { id: "knight", label: "Knight", desc: "Heavy plate armor with shield" },
  { id: "rogue", label: "Rogue", desc: "Stealthy figure with dual daggers" },
  { id: "healer", label: "Healer", desc: "Gentle figure with glowing hands" },
];

export const ANIMATION_PRESETS = [
  { id: 1001, label: "Default", desc: "Default motion" },
  { id: 30, label: "Walk", desc: "Casual walking" },
  { id: 14, label: "Run", desc: "Running forward" },
  { id: 28, label: "Wave", desc: "Waving hello" },
  { id: 4, label: "Attack", desc: "Combat attack" },
  { id: 1, label: "Strut", desc: "Stylish walk" },
];

export function buildQuickPrompt(gender, style) {
  const g = gender === "male" ? "male" : "female";
  const styleObj = QUICK_STYLES.find((s) => s.id === style);
  const desc = styleObj ? styleObj.desc : "adventurer";
  return `a ${g} ${desc}, full body character, T-pose, front facing, humanoid bipedal figure with clearly visible arms legs and head, game character concept art, solid white background, high quality, centered`;
}

export function ModeCard({ title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-lg hover:border-[var(--text-muted)] transition-colors cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--text)] text-sm font-medium">{title}</div>
          <div className="text-[var(--text-muted)] text-xs mt-0.5">{desc}</div>
        </div>
        <svg
          className="w-4 h-4 text-[var(--text-dim)] group-hover:text-[var(--text-muted)] transition-colors"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </div>
    </button>
  );
}

export function NameInput({ value, onChange }) {
  return (
    <div>
      <label className="text-xs text-[var(--text-muted)] mb-1 block">
        Name <span className="text-[var(--text-dim)]">(optional)</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Aria the Brave"
        className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-lg px-4 py-2.5 text-[var(--text)] text-sm placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--text-muted)]"
      />
    </div>
  );
}

export function StepDot({ label, active, done }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", done ? "bg-green-400" : active ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--surface-3)]")} />
      <span className={done ? "text-green-400" : active ? "text-[var(--text)]" : "text-[var(--text-dim)]"}>{label}</span>
    </div>
  );
}

export function LoadingBar({ text }) {
  return (
    <div className="w-full flex items-center justify-center gap-3 py-3 bg-[var(--surface-0)] rounded-lg">
      <svg className="animate-spin h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-[var(--text-muted)] text-xs">{text}</span>
    </div>
  );
}
