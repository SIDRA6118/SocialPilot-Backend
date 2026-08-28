import { useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Login({
  onLogin,
  onShowRegister,
  savedAccounts = [],
  onSelectAccount,
  onRemoveAccount,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const selectSavedAccount = (account) => {
    onSelectAccount(account);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/token/`,
        {
          username: username,
          password: password,
        },
        { timeout: 10000 }
      );

      localStorage.setItem(
        "access_token",
        response.data.access
      );

      localStorage.setItem(
        "refresh_token",
        response.data.refresh
      );

      onLogin({
        username,
        access: response.data.access,
        refresh: response.data.refresh,
      });
    } catch (error) {
      console.error(error);

      if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
        setError(
          "Unable to connect to the server. Start Django on port 8000 and try again."
        );
      } else if (error.response?.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError(
          error.response?.data?.detail ||
            "Login failed. Please try again."
        );
      }
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
            Plan, publish, and understand your social presence from one
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
            <p>Sign in to continue managing your content and campaigns.</p>
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
              <div className="password-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {savedAccounts.length > 0 && (
            <div className="saved-accounts">
              <div className="saved-accounts-heading">
                <span>Saved accounts</span>
                <small>Switch without retyping your details</small>
              </div>

              {savedAccounts.map((account) => (
                <div className="saved-account" key={account.username}>
                  <button
                    type="button"
                    className="saved-account-select"
                    onClick={() => selectSavedAccount(account)}
                  >
                    <span className="saved-account-avatar">
                      {account.username.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{account.username}</strong>
                      <small>Saved SocialPilot account</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-account-remove"
                    onClick={() => onRemoveAccount(account.username)}
                    aria-label={`Remove ${account.username} from saved accounts`}
                    title="Remove saved account"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="auth-switch">
            New to SocialPilot?{" "}
              <button type="button" onClick={onShowRegister}>
              Create your workspace
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;