import { useSnapshot } from "valtio";
import { editorStore, updateObject } from "../../stores/editorStore";

const animations = [
  { value: "none", label: "None" },
  { value: "bounce", label: "Bounce" },
  { value: "spin", label: "Spin" },
  { value: "float", label: "Float" },
  { value: "walk", label: "Walk" },
  { value: "jump", label: "Jump" },
  { value: "pulse", label: "Pulse" },
];

function VectorInput({ label, value, onChange }) {
  const labels = ["X", "Y", "Z"];
  return (
    <div>
      <label className="text-[11px] text-[var(--text-muted)] mb-1 block">{label}</label>
      <div className="flex gap-1">
        {value.map((v, i) => (
          <div key={i} className="flex-1 flex items-center gap-1">
            <span className="text-[10px] text-[var(--text-dim)] w-2">{labels[i]}</span>
            <input
              type="number"
              step="0.1"
              value={Number(v).toFixed(2)}
              onChange={(e) => {
                const newVal = [...value];
                newVal[i] = parseFloat(e.target.value) || 0;
                onChange(newVal);
              }}
              className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded px-1.5 py-1 text-[11px] text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const snap = useSnapshot(editorStore);
  const obj = snap.objects.find((o) => o.id === snap.selectedId);

  if (!obj) return null;

  const update = (props) => updateObject(obj.id, props);

  return (
    <div className="flex flex-col border-b border-[var(--border)] shrink-0 max-h-[60%]">
      <div className="px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Properties</h3>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Name */}
        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Name</label>
          <input
            type="text"
            value={obj.name}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)]"
          />
        </div>

        <VectorInput label="Position" value={obj.position} onChange={(position) => update({ position })} />
        <VectorInput label="Rotation" value={obj.rotation} onChange={(rotation) => update({ rotation })} />
        <VectorInput label="Scale" value={obj.scale} onChange={(scale) => update({ scale })} />

        {/* Color */}
        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={obj.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-[var(--surface-3)] bg-transparent"
            />
            <input
              type="text"
              value={obj.color}
              onChange={(e) => update({ color: e.target.value })}
              className="flex-1 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded px-2 py-1 text-[11px] text-[var(--text)] font-mono focus:outline-none focus:border-[var(--text-muted)]"
            />
          </div>
        </div>

        {/* Material */}
        {obj.type !== "character" && (
          <>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Metalness {Number(obj.metalness).toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={obj.metalness}
                onChange={(e) => update({ metalness: parseFloat(e.target.value) })}
                className="w-full accent-[var(--accent)] h-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Roughness {Number(obj.roughness).toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={obj.roughness}
                onChange={(e) => update({ roughness: parseFloat(e.target.value) })}
                className="w-full accent-[var(--accent)] h-1"
              />
            </div>
          </>
        )}

        {/* Animation */}
        <div>
          <label className="text-[11px] text-[var(--text-muted)] mb-1 block">Animation</label>
          <select
            value={obj.animation}
            onChange={(e) => update({ animation: e.target.value })}
            className="w-full bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] cursor-pointer"
          >
            {animations.map((a) => (
              <option key={a.value} value={a.value} className="bg-[var(--surface-0)]">
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Physics */}
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[var(--text-muted)]">Physics</label>
          <button
            className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${obj.physics ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`}
            onClick={() => update({ physics: !obj.physics })}
          >
            <div
              className={`w-3 h-3 rounded-full transition-transform mx-0.5 ${obj.physics ? "translate-x-3.5 bg-[var(--border)]" : "translate-x-0 bg-[var(--text-muted)]"}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
