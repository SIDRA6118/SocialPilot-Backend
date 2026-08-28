import { useState } from "react";
import axios from "axios";

function Register({ onRegister, onBackToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

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
    }
  };

  return (
    <div className="app">
      <div className="card login-card">

        <h1 className="logo">
          SocialPilot
        </h1>

        <p className="subtitle">
          Create your account
        </p>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Username</label>

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Create a password"
              required
            />
          </div>

          {error && (
            <p style={{ color: "#dc2626" }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: "#059669" }}>
              {success}
            </p>
          )}

          <button type="submit">
            Create Account
          </button>

        </form>

        <button
          type="button"
          onClick={onBackToLogin}
          style={{
            marginTop: "10px",
            background: "#6b7280",
          }}
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}

export default Register;