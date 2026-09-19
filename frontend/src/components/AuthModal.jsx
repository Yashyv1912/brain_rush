import React, { useState } from "react";
import { authAPI } from "../services/api";

export default function AuthModal({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await authAPI.login(email, password);
      } else {
        data = await authAPI.register(name, email, password);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-landing-page">
      {/* Background Ambient Glows */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <div className="auth-landing-container">
        {/* Left Branding Panel */}
        <div className="auth-brand-panel">
          <div className="brand-badge">
            <span className="badge-dot"></span>
            <span>Live WebSockets + CRDT Sync</span>
          </div>
          
          <h1 className="landing-title">
            Brain<span className="highlight-text">Rush</span>
          </h1>
          <p className="landing-description">
            Experience lightning-fast real-time collaborative code editing powered by VS Code Monaco Editor, Yjs CRDTs, and live multi-user presence awareness.
          </p>

          <div className="feature-grid">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div>
                <strong>VS Code Monaco Engine</strong>
                <p>Full syntax highlighting, line numbers, and multi-language support</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <div>
                <strong>Conflict-Free Real-Time Sync</strong>
                <p>Yjs CRDT algorithms eliminate typing lag and character duplication</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <div>
                <strong>Collaborator Presence</strong>
                <p>Live user avatars and online indicators in every code room</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Form Card */}
        <div className="auth-card-panel">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">
                <span className="logo-icon">🧠</span>
                <h2>BrainRush Collab</h2>
              </div>
              <p className="auth-subtitle">
                {isLogin ? "Sign in to access your code workspace" : "Create your account to start collaborating"}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`tab-btn ${isLogin ? "active" : ""}`}
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${!isLogin ? "active" : ""}`}
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="auth-error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <span className="spinner"></span>
                ) : isLogin ? (
                  "Sign In to Workspace →"
                ) : (
                  "Create Account & Launch →"
                )}
              </button>
            </form>

            <div className="auth-footer">
              <span>🔒 Encrypted session with JWT & HTTP-only cookies</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
