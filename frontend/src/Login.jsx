import { useState } from "react";
import axios from "axios";

function Login({ onLogin, onShowRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/token/",
        {
          username: username,
          password: password,
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access
      );

      localStorage.setItem(
        "refresh_token",
        response.data.refresh
      );

      onLogin();
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.detail ||
          "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-brand">
          <span className="auth-brand-mark">S</span>
          <span>SocialPilot</span>
        </div>

        <div className="auth-visual-copy">
          <span className="auth-kicker">SOCIAL WORK, SIMPLIFIED</span>
          <h1>Turn your ideas into meaningful conversations.</h1>
          <p>
            Plan, publish, and understand your social presence from one calm,
            focused workspace.
          </p>
        </div>

        <div className="auth-visual-footer">
          <span className="auth-dot"></span>
          <span>Everything your team needs to stay consistent.</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="auth-eyebrow">WELCOME BACK</span>
            <h2>Sign in to your workspace</h2>
            <p>Enter your details to continue managing your campaigns.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex.smith"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            New to SocialPilot?{" "}
            <button type="button" onClick={onShowRegister}>
              Create an account
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;