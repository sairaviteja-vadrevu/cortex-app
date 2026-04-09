import { useState } from "react";
import { signup, signin } from "../../stores/authStore";
import { navigate } from "../../stores/appStore";

export function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await signup(name, email, password);
      } else {
        await signin(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface-0)" }}>
      <div
        style={{
          width: 400,
          background: "var(--surface-1)",
          border: "3px solid var(--border)",
          borderRadius: 16,
          boxShadow: "var(--neu-shadow)",
          padding: 32,
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center" style={{ marginBottom: 28 }}>
          <img
            src="https://cdn.prod.website-files.com/6788bb7d17ed7e14d9d3caed/6788efffc7e76937b35586d5_g5.png"
            alt="G5"
            className="h-10 w-10 object-contain"
          />
        </div>

        <h1 className="text-xl font-bold text-center" style={{ color: "var(--text)", marginBottom: 6 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          {mode === "signin" ? "Sign in to Cotex App" : "Get started with Cotex App"}
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(255,107,107,0.12)",
              border: "2px solid var(--accent-secondary)",
              marginBottom: 16,
            }}
          >
            <p style={{ color: "var(--accent-secondary)", fontSize: 13 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "2px solid var(--surface-3)",
                  backgroundColor: "var(--surface-0)",
                  color: "var(--text)",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "2px solid var(--surface-3)",
                backgroundColor: "var(--surface-0)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "2px solid var(--surface-3)",
                backgroundColor: "var(--surface-0)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer transition-all duration-150"
            style={{
              padding: "12px 0",
              borderRadius: 10,
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "3px solid var(--border)",
              boxShadow: "var(--neu-shadow-sm)",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--text-muted)", marginTop: 20 }}>
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
            }}
            className="cursor-pointer"
            style={{ color: "var(--accent)", fontWeight: 600, background: "none", border: "none", fontFamily: "inherit", fontSize: "inherit" }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
