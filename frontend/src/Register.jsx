import { useState } from "react";
import axios from "axios";

function Register({ onRegister, onBackToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await axios.post(
        "http://127.0.0.1:8000/api/register/",
        {
          username,
          email,
          password,
        }
      );

      setSuccess(
        "Account created successfully! You can now login."
      );

      setUsername("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        onRegister();
      }, 1200);
    } catch (error) {
      console.error(error);

      if (error.response?.data) {
        const data = error.response.data;

        if (data.username) {
          setError(data.username[0]);
        } else if (data.email) {
          setError(data.email[0]);
        } else if (data.password) {
          setError(data.password[0]);
        } else {
          setError("Registration failed.");
        }
      } else {
        setError("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual auth-visual-register">
        <div className="auth-brand">
          <span className="auth-brand-mark">S</span>
          <span>SocialPilot</span>
        </div>

        <div className="auth-visual-copy">
          <span className="auth-kicker">BUILD YOUR MOMENTUM</span>
          <h1>Your next great campaign starts here.</h1>
          <p>
            Bring your channels together, keep your voice consistent, and make
            every post count.
          </p>
        </div>

        <div className="auth-visual-footer">
          <span className="auth-dot"></span>
          <span>One workspace. Every social moment.</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="auth-eyebrow">GET STARTED</span>
            <h2>Create your workspace</h2>
            <p>Set up your account and start planning with clarity.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-field">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <small className="auth-hint">Use at least 8 characters.</small>
            </div>

            {error && <p className="auth-error">{error}</p>}
            {success && <p className="auth-success">{success}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={onBackToLogin}>
              Sign in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;