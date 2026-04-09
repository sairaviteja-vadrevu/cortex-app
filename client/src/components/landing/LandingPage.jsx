import { navigate } from "../../stores/appStore";
import { cardStyle, heroBg, glowSpot } from "../../utils/theme";

/* ------------------------------------------------------------------ */
/*  Inline SVG icons for feature cards                                 */
/* ------------------------------------------------------------------ */

const icons = {
  world: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gWorld)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gWorld" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-tertiary)" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.5 9h17M3.5 15h17" />
    </svg>
  ),
  film: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gFilm)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gFilm" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-tertiary)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20M17 2v20M2 7h5M17 7h5M2 12h20M2 17h5M17 17h5" />
    </svg>
  ),
  image: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gImg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gImg" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-secondary)" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  character: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gChar)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gChar" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent-tertiary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  analysis: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gAI)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gAI" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-tertiary)" />
        </linearGradient>
      </defs>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
    </svg>
  ),
  export: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#gExp)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="gExp" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-tertiary)" />
        </linearGradient>
      </defs>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

const features = [
  { icon: icons.world, title: "3D World Builder", desc: "Build immersive environments with AI characters, physics, and lighting." },
  { icon: icons.film, title: "Film Production", desc: "Script analysis, scene splitting, storyboards, voice-over, and music." },
  { icon: icons.image, title: "Image & Video Studio", desc: "Generate stunning visuals from text prompts with state-of-the-art AI." },
  { icon: icons.character, title: "Character Library", desc: "Reusable AI-generated characters across all your projects." },
  { icon: icons.analysis, title: "AI Scene Analysis", desc: "Gemini-powered script breakdown with auto character extraction." },
  { icon: icons.export, title: "Export & Share", desc: "PDF storyboards, video assembly, and full project export." },
];

const steps = [
  { num: "1", title: "Describe", desc: "Write a prompt, upload a script, or describe the world you want to create." },
  { num: "2", title: "Generate", desc: "AI builds characters, scenes, storyboards, and visuals in seconds." },
  { num: "3", title: "Create", desc: "Refine, export, and share polished creative assets with your team." },
];

const footerCols = [
  { heading: "Product", links: ["World Builder", "Film Studio", "Image Generation", "Characters"] },
  { heading: "Resources", links: ["Documentation", "API Reference", "Tutorials", "Blog"] },
  { heading: "Company", links: ["About", "Careers", "Contact", "Privacy Policy"] },
];

/* ------------------------------------------------------------------ */
/*  Scrolling helper                                                   */
/* ------------------------------------------------------------------ */
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--border)",
        color: "var(--text)",
        fontFamily: "'Space Grotesk', sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* ========== NAV ========== */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "var(--border)",
          borderBottom: "3px solid var(--surface-0)",
        }}
      >
        <div
          style={{ padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1280, margin: "0 auto" }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--accent)",
                border: "2px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--neu-shadow-sm)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
              Cotex App
            </span>
          </div>

          {/* Center links */}
          <div style={{ display: "flex", gap: 32 }}>
            {["Features", "Showcase", "How it Works"].map((label) => (
              <button
                key={label}
                onClick={() => scrollTo(label.toLowerCase().replace(/\s+/g, "-"))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit", color: "var(--text-muted)", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate("/dashboard")}
            className="hover:opacity-90 transition-opacity"
            style={{
              background: "var(--accent)",
              border: "3px solid var(--border)",
              color: "var(--accent-text)",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 8,
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "var(--neu-shadow-sm)",
            }}
          >
            Launch Cortex &rarr;
          </button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "120px 24px 80px",
        }}
      >
        {/* Background glow */}
        <div style={{ ...glowSpot("rgba(108,99,255,0.12)", 900), top: -200, left: "50%", transform: "translateX(-50%)" }} />
        <div style={{ ...glowSpot("rgba(255,214,10,0.06)", 600), top: 100, left: "30%", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", inset: 0, background: heroBg, pointerEvents: "none" }} />

        {/* Badge */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            maxWidth: 800,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 100,
              border: "2px solid var(--surface-3)",
              background: "var(--surface-0)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(255,214,10,0.6)",
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>AI-Powered Creative Studio</span>
          </div>

          {/* Heading */}
          <h1
            style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.04em", margin: 0, color: "var(--text)" }}
          >
            Build Worlds.{"\n"}
            <br />
            Direct Films.{"\n"}
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Generate Everything.
            </span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 560, margin: 0, color: "var(--text-muted)" }}>
            The AI-powered creative studio for world building, film production, and generative media.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:opacity-90 transition-opacity"
              style={{
                padding: "14px 32px",
                borderRadius: 10,
                background: "var(--accent)",
                color: "var(--accent-text)",
                fontWeight: 700,
                fontSize: 15,
                border: "3px solid var(--border)",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "var(--neu-shadow)",
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => scrollTo("features")}
              style={{
                padding: "14px 32px",
                borderRadius: 10,
                background: "var(--surface-1)",
                fontWeight: 600,
                fontSize: 15,
                border: "3px solid var(--surface-3)",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "var(--neu-shadow-sm)",
                color: "var(--text)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Mockup card */}
        <div style={{ position: "relative", zIndex: 1, marginTop: 64, width: "100%", maxWidth: 900 }}>
          <div style={{ transform: "perspective(1200px) rotateX(5deg)", ...cardStyle, overflow: "hidden" }}>
            {/* Simulated app chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: "2px solid var(--surface-3)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 500, color: "var(--text-dim)" }}>
                Cotex App - World Editor
              </span>
            </div>
            {/* Gradient body */}
            <div
              style={{
                height: 340,
                background: "linear-gradient(135deg, rgba(108,99,255,0.08) 0%, var(--surface-0) 40%, rgba(108,99,255,0.04) 100%)",
                position: "relative",
              }}
            >
              {/* Fake sidebar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 56,
                  borderRight: "2px solid var(--surface-1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 0",
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{ width: 24, height: 24, borderRadius: 6, background: i === 1 ? "rgba(108,99,255,0.3)" : "var(--surface-1)" }}
                  />
                ))}
              </div>
              {/* Fake content area */}
              <div style={{ marginLeft: 56, padding: 24, display: "flex", gap: 16, height: "100%" }}>
                {/* Main viewport */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    background: "linear-gradient(180deg, rgba(108,99,255,0.06) 0%, var(--surface-0) 100%)",
                    border: "2px solid var(--surface-1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(108,99,255,0.3), transparent 70%)",
                    }}
                  />
                </div>
                {/* Fake right panel */}
                <div style={{ width: 180, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{ borderRadius: 8, background: "var(--surface-1)", border: "2px solid var(--surface-3)", padding: 12, flex: 1 }}
                    >
                      <div style={{ width: "60%", height: 8, borderRadius: 4, background: "var(--surface-3)", marginBottom: 8 }} />
                      <div style={{ width: "80%", height: 6, borderRadius: 3, background: "var(--surface-1)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Reflection glow */}
          <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", ...glowSpot("rgba(108,99,255,0.08)", 500) }} />
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, marginBottom: 14, color: "var(--text)" }}>
            Everything You Need
          </h2>
          <p style={{ fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7, color: "var(--text-muted)" }}>
            A complete creative toolkit powered by the most advanced AI models, built for filmmakers, world builders, and visual storytellers.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="transition-colors"
              style={{ ...cardStyle, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, cursor: "default" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: "2px solid var(--surface-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== SHOWCASE (mockup section) ========== */}
      <section id="showcase" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, marginBottom: 14, color: "var(--text)" }}>
            See It In Action
          </h2>
          <p style={{ fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7, color: "var(--text-muted)" }}>
            From script to screen in minutes. Watch how Cotex App transforms your creative vision.
          </p>
        </div>
        <div style={{ ...cardStyle, overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: 400,
              background: "linear-gradient(135deg, rgba(108,99,255,0.06) 0%, var(--surface-0) 50%, rgba(108,99,255,0.04) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "var(--surface-0)",
                  border: "2px solid var(--surface-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <polygon points="9.5 7.5 16.5 12 9.5 16.5" fill="var(--accent)" />
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>
                Interactive Demo Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1000, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, marginBottom: 14, color: "var(--text)" }}>
            How It Works
          </h2>
          <p style={{ fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7, color: "var(--text-muted)" }}>
            Three simple steps from idea to finished creative asset.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, position: "relative" }}>
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 32,
              left: "calc(16.66% + 32px)",
              right: "calc(16.66% + 32px)",
              height: 3,
              background: "linear-gradient(90deg, var(--accent), var(--accent-tertiary), var(--accent))",
            }}
          />

          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                padding: "0 20px",
              }}
            >
              {/* Number badge */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--surface-0)",
                  border: "3px solid var(--surface-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 2,
                  boxShadow: "var(--neu-shadow-sm)",
                }}
              >
                <span style={{ color: "var(--accent)" }}>{s.num}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8, color: "var(--text)" }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, maxWidth: 240, color: "var(--text-muted)" }}>
                {s.desc}
              </p>
              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div style={{ position: "absolute", top: 28, right: -8, zIndex: 3 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: "72px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Glow */}
          <div style={{ ...glowSpot("rgba(255,214,10,0.08)", 500), top: -150, left: "50%", transform: "translateX(-50%)" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.2, color: "var(--text)" }}>
              Ready to create something
              <br />
              extraordinary?
            </h2>
            <p style={{ fontSize: 16, margin: 0, maxWidth: 400, lineHeight: 1.65, color: "var(--text-muted)" }}>
              Join creators, filmmakers, and storytellers who are building the future of media with AI.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:opacity-90 transition-opacity"
              style={{
                padding: "16px 40px",
                borderRadius: 10,
                background: "var(--accent)",
                color: "var(--accent-text)",
                fontWeight: 700,
                fontSize: 16,
                border: "3px solid var(--border)",
                cursor: "pointer",
                fontFamily: "inherit",
                marginTop: 8,
                boxShadow: "var(--neu-shadow)",
              }}
            >
              Launch Cotex App
            </button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ borderTop: "3px solid var(--surface-0)", padding: "64px 24px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, marginBottom: 48 }}>
          {footerCols.map((col) => (
            <div key={col.heading}>
              <h4
                style={{ fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 16, letterSpacing: "0.02em", textTransform: "uppercase", color: "var(--text)" }}
              >
                {col.heading}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link) => (
                  <li key={link}>
                    <span style={{ fontSize: 14, cursor: "pointer", color: "var(--text-muted)", transition: "color 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{ borderTop: "3px solid var(--surface-0)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            &copy; 2026 Cotex App. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Built with AI
          </span>
        </div>
      </footer>
    </div>
  );
}
