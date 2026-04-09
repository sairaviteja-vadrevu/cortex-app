import { replicate } from "../../utils/replicate";
import { useState } from "react";
import { useSnapshot } from "valtio";
import { characterStore, addCharacter, updateCharacter, deleteCharacter } from "../../stores/characterStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { cardStyle, inputStyle, pagePadding, gridCols } from "../../utils/theme";

function CharacterCard({ character }) {
  const [hovering, setHovering] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGeneratePortrait = async () => {
    setGenerating(true);
    try {
      const output = await replicate("google/nano-banana", {
        prompt: `Character portrait, ${character.name}, ${character.description}, cinematic headshot, high quality`,
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
      });
      const imageUrl = Array.isArray(output) ? output[0] : output;
      updateCharacter(character.id, { imageUrl });
    } catch (err) {
      console.error("Portrait generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        ...cardStyle,
        padding: 0,
        position: "relative",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Delete button on hover */}
      {hovering && (
        <button
          onClick={() => deleteCharacter(character.id)}
          className="absolute top-2 right-2 z-10 transition-colors cursor-pointer"
          style={{
            color: "var(--text-muted)",
            backgroundColor: "var(--surface-0)",
            border: "2px solid var(--surface-3)",
            borderRadius: 6,
            padding: 4,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}

      {/* Portrait */}
      <div
        style={{
          borderRadius: "9px 9px 0 0",
          backgroundColor: "var(--surface-0)",
        }}
        className="relative overflow-hidden"
      >
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            style={{ width: "100%", aspectRatio: "1", borderRadius: "9px 9px 0 0" }}
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center" style={{ width: "100%", aspectRatio: "1" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--surface-3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12 }}>
        <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{character.name}</h3>
        {character.description && (
          <p className="text-xs truncate" style={{ color: "var(--text-muted)", marginTop: 4 }}>
            {character.description}
          </p>
        )}

        {/* Tags */}
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 4, marginTop: 8 }}>
            {character.tags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Generate Portrait button */}
        {!character.imageUrl && (
          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" size="sm" onClick={handleGeneratePortrait} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
                  </svg>
                  Generate Portrait
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddCharacterModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    addCharacter({ name: name.trim(), description: description.trim(), tags });
    setName("");
    setDescription("");
    setTagsInput("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Character">
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="text-xs font-medium block" style={{ color: "var(--text-muted)", marginBottom: 6 }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              className="text-sm focus:outline-none"
              style={{ ...inputStyle, color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block" style={{ color: "var(--text-muted)", marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief character description"
              rows={3}
              className="text-sm focus:outline-none resize-none"
              style={{ ...inputStyle, color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block" style={{ color: "var(--text-muted)", marginBottom: 6 }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="hero, warrior, fantasy"
              className="text-sm focus:outline-none"
              style={{ ...inputStyle, color: "var(--text)" }}
            />
          </div>
        </div>
        <div className="flex justify-end" style={{ gap: 8, marginTop: 20 }}>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={!name.trim()}>
            Add Character
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CharacterLibrary() {
  const snap = useSnapshot(characterStore);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterTag, setFilterTag] = useState(null);

  // Collect all unique tags
  const allTags = [...new Set(snap.characters.flatMap((c) => c.tags || []))];

  // Filter characters by selected tag
  const filtered = filterTag ? snap.characters.filter((c) => c.tags?.includes(filterTag)) : snap.characters;

  return (
    <div className="flex-1 overflow-auto">
      <div style={pagePadding}>
        {/* Header provided by PageHeader */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Character
          </Button>
        </div>

        {/* Filter tags row */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center" style={{ gap: 6, marginBottom: 20 }}>
            <button
              onClick={() => setFilterTag(null)}
              className="text-xs font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: filterTag === null ? "var(--accent)" : "var(--surface-0)",
                color: filterTag === null ? "var(--border)" : "var(--text-muted)",
                border: filterTag === null ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                borderRadius: 999,
                padding: "4px 12px",
                fontWeight: filterTag === null ? 600 : 400,
                boxShadow: filterTag === null ? "var(--neu-shadow-sm)" : "none",
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className="text-xs font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: filterTag === tag ? "var(--accent)" : "var(--surface-0)",
                  color: filterTag === tag ? "var(--border)" : "var(--text-muted)",
                  border: filterTag === tag ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontWeight: filterTag === tag ? 600 : 400,
                  boxShadow: filterTag === tag ? "var(--neu-shadow-sm)" : "none",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Character grid or empty state */}
        {filtered.length > 0 ? (
          <div style={gridCols(220)}>
            {filtered.map((char) => (
              <CharacterCard key={char.id} character={char} />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: 64,
              border: "2px dashed var(--surface-3)",
              borderRadius: 12,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--surface-3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 16 }}>
              No characters yet
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)", marginTop: 4 }}>
              Create your first character to get started
            </p>
            <div style={{ marginTop: 16 }}>
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
                Add Character
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddCharacterModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
