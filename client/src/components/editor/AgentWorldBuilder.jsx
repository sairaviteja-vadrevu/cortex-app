import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { worldStore, saveCurrentWorld } from "../../stores/worldStore";
import { editorStore, loadWorldIntoEditor, getEditorData } from "../../stores/editorStore";
import { worldAgentStore, sendAgentMessage, clearAgentChat } from "../../stores/worldAgentStore";
import { appStore, navigate } from "../../stores/appStore";
import { statusDone, statusDoneBorder } from "../../utils/theme";
import { Scene } from "./Scene";
import { Toolbar } from "./Toolbar";
import { ScenePanel } from "./ScenePanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AudioPlayer } from "./AudioPlayer";
import { CharacterCreator } from "./CharacterCreator";

export function AgentWorldBuilder() {
  const worldSnap = useSnapshot(worldStore);
  const snap = useSnapshot(editorStore);
  const agentSnap = useSnapshot(worldAgentStore);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const world = worldSnap.worlds.find((w) => w.id === worldSnap.currentWorldId);

  useEffect(() => {
    if (world) {
      loadWorldIntoEditor(world);
      clearAgentChat();
    }
  }, [worldSnap.currentWorldId]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      if (worldStore.currentWorldId) saveCurrentWorld(getEditorData());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (worldStore.currentWorldId) saveCurrentWorld(getEditorData());
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentSnap.messages.length]);

  if (!world) return null;

  const handleSend = () => {
    if (!input.trim() || agentSnap.isTyping) return;
    sendAgentMessage(input.trim());
    setInput("");
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "var(--border)" }}>
      <Toolbar onCreateCharacter={() => setShowCharacterCreator(true)} onOpenKimodo={() => setShowKimodoPanel(true)} />

      <div className="flex-1 flex min-h-0">
        {/* Scene panel */}
        {!snap.isPlaying && <ScenePanel />}

        {/* 3D Viewport */}
        <div className="flex-1 relative min-w-0">
          <Scene />
          {snap.isPlaying && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--border)]/80 backdrop-blur-sm border border-[var(--border)] rounded-full px-5 py-2 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[var(--text)] text-xs font-medium">Playing</span>
            </div>
          )}
        </div>

        {/* Properties panel when object is selected (not playing) */}
        {!snap.isPlaying && snap.selectedId && (
          <div className="w-56 border-l border-[var(--border)] flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--border)" }}>
            <PropertiesPanel />
          </div>
        )}

        {/* Agent Chat Panel */}
        <div
          className="flex flex-col"
          style={{
            width: 380,
            flexShrink: 0,
            borderLeft: "2px solid var(--surface-3)",
            background: "var(--surface-0)",
          }}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between"
            style={{
              padding: "10px 16px",
              borderBottom: "2px solid var(--surface-3)",
            }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: statusDone,
                  boxShadow: `0 0 6px ${statusDoneBorder}`,
                }}
              />
              <span className="text-[var(--text)] text-sm font-semibold">World Agent</span>
            </div>
            <button
              onClick={() => clearAgentChat()}
              className="text-[var(--text-muted)] hover:text-zinc-300 transition-colors cursor-pointer text-xs"
              style={{ border: "none", background: "transparent" }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto" style={{ padding: "12px 16px" }}>
            {agentSnap.messages.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--surface-3)]"
                  style={{ margin: "0 auto 12px" }}
                >
                  <circle cx="12" cy="12" r="9" />
                  <ellipse cx="12" cy="12" rx="4" ry="9" />
                  <path d="M3.5 9h17M3.5 15h17" />
                </svg>
                <p className="text-[var(--text)] text-sm font-medium" style={{ marginBottom: 4 }}>
                  Describe what to build
                </p>
                <p className="text-[var(--text-muted)]" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
                  Tell me what to create and I'll build it in your 3D scene.
                </p>

                {/* Suggestion chips */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Add a red sphere and make it bounce",
                    "Generate a fantasy forest background",
                    "Create a 3D model of a robot",
                    "Add ambient rain sounds",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                      }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                      style={{
                        border: "2px solid var(--surface-3)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        background: "var(--surface-1)",
                        textAlign: "left",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {agentSnap.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {agentSnap.isTyping && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      padding: "8px 12px",
                      alignSelf: "flex-start",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Generating assets status */}
          {agentSnap.generatingAssets.some((a) => a.status === "generating") && (
            <div
              style={{
                padding: "8px 16px",
                borderTop: "2px solid var(--surface-3)",
                background: "var(--surface-2)",
              }}
            >
              {agentSnap.generatingAssets
                .filter((a) => a.status === "generating")
                .map((a) => (
                  <div key={a.id} className="flex items-center" style={{ gap: 8, padding: "2px 0" }}>
                    <svg width="12" height="12" className="animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-[var(--accent)]">
                      {a.label}
                      {a.progress ? `: ${a.progress}` : "..."}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Input */}
          <div
            className="shrink-0"
            style={{
              padding: "12px 16px",
              borderTop: "2px solid var(--surface-3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: "var(--surface-1)",
                border: "2px solid var(--surface-3)",
                borderRadius: 12,
                padding: "8px 12px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="What do you want to build?"
                rows={1}
                className="flex-1 text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none resize-none bg-transparent"
                style={{ border: "none", fontFamily: "inherit", minHeight: 20, maxHeight: 80 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || agentSnap.isTyping}
                className="text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                style={{ border: "none", background: "transparent", padding: 2, flexShrink: 0 }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AudioPlayer />
      <CharacterCreator open={showCharacterCreator} onClose={() => setShowCharacterCreator(false)} />
    </div>
  );
}

/* --- Message bubble --- */
function MessageBubble({ msg }) {
  const [showProcess, setShowProcess] = useState(false);
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div style={{ padding: "4px 0" }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "var(--accent-tertiary)" }} />
          <span className="text-xs text-[var(--text-muted)]">{msg.text}</span>
        </div>
        {msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt=""
            style={{
              width: 80,
              height: 80,
              objectFit: "cover",
              borderRadius: 6,
              marginTop: 4,
              marginLeft: 10,
              border: "2px solid var(--surface-3)",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "88%",
          padding: "8px 12px",
          borderRadius: 12,
          borderTopRightRadius: isUser ? 4 : 12,
          borderTopLeftRadius: isUser ? 12 : 4,
          backgroundColor: isUser ? "var(--surface-2)" : "var(--surface-1)",
          border: "2px solid var(--surface-3)",
        }}
      >
        {msg.thinking && (
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold" style={{ marginBottom: 4 }}>
            Thinking
          </div>
        )}
        <p
          className="text-sm leading-relaxed"
          style={{ color: isUser ? "var(--text)" : "var(--text-muted)", whiteSpace: "pre-wrap" }}
          dangerouslySetInnerHTML={{
            __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:white'>$1</strong>").replace(/\n/g, "<br/>"),
          }}
        />
        {msg.imageUrl && (
          <img
            src={msg.imageUrl}
            alt=""
            style={{
              width: "100%",
              maxWidth: 200,
              borderRadius: 8,
              marginTop: 8,
              border: "2px solid var(--surface-3)",
            }}
          />
        )}
      </div>
    </div>
  );
}
