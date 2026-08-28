import { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/posts/";
const REFRESH_URL = "http://127.0.0.1:8000/api/token/refresh/";

const getHeaders = () => {
  const accessToken = localStorage.getItem("access_token");

  return {
    "Content-Type": "application/json",
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  };
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(REFRESH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return false;
  }

  const data = await response.json();
  localStorage.setItem("access_token", data.access);
  return true;
};

const requestWithAuth = async (url, options = {}) => {
  let response = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });

  if (response.status === 401 && await refreshAccessToken()) {
    response = await fetch(url, {
      ...options,
      headers: getHeaders(),
    });
  }

  return response;
};

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    content: "",
    platform: "LinkedIn",
    scheduled_time: "",
  });

  // =====================================================
  // FETCH POSTS
  // =====================================================

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await requestWithAuth(API_URL, {
        method: "GET",
      });

      const data = await response.json();

      console.log("GET /api/posts/ response:", data);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Unauthorized. Your access token is invalid or expired."
          );
        }

        throw new Error(
          data.detail || data.message || "Failed to fetch posts."
        );
      }

      if (Array.isArray(data)) {
        setPosts(data);
      } else if (Array.isArray(data.results)) {
        setPosts(data.results);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Fetch posts error:", error);

      setMessage(
        error.message || "Unable to connect with Django backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // LOAD POSTS WHEN APP STARTS
  // =====================================================

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => {
      fetchPosts();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, [fetchPosts]);

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE / SCHEDULE POST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous message
    setMessage("");

    // Validate content
    if (!form.content.trim()) {
      setMessage("Please enter post content.");
      return;
    }

    // Validate schedule time
    if (!form.scheduled_time) {
      setMessage("Please select schedule date and time.");
      return;
    }

    if (!localStorage.getItem("access_token")) {
      setMessage("Please login before scheduling a post.");
      return;
    }

    try {
      setLoading(true);

      const response = await requestWithAuth(API_URL, {
        method: "POST",
        body: JSON.stringify({
          content: form.content.trim(),
          platform: form.platform,
          scheduled_time: new Date(
            form.scheduled_time
          ).toISOString(),
        }),
      });

      const data = await response.json();

      console.log("POST /api/posts/ response:", data);

      // =================================================
      // HANDLE ERROR
      // =================================================

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "401 Unauthorized: Access token is invalid or expired."
          );
        }

        if (response.status === 400) {
          console.error("Validation error:", data);

          throw new Error(
            data.detail ||
              data.message ||
              "Invalid post data. Check the required fields."
          );
        }

        throw new Error(
          data.detail ||
            data.message ||
            "Post creation failed."
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      console.log("Post created successfully:", data);

      setMessage("Post scheduled successfully! 🎉");

      // Clear form
      setForm({
        content: "",
        platform: "LinkedIn",
        scheduled_time: "",
      });

      // Reload posts
      await fetchPosts();
    } catch (error) {
      console.error("Post creation error:", error);

      setMessage(
        error.message || "Failed to schedule post."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DELETE POST
  // =====================================================

  const deletePost = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await requestWithAuth(`${API_URL}${id}/`, {
        method: "DELETE",
      });

      // DELETE may return 204 No Content
      if (!response.ok) {
        let data = {};

        try {
          data = await response.json();
        } catch {
          // Response may have no JSON body
        }

        if (response.status === 401) {
          throw new Error(
            "401 Unauthorized: Access token is invalid or expired."
          );
        }

        throw new Error(
          data.detail ||
            data.message ||
            "Delete failed."
        );
      }

      setMessage("Post deleted successfully. 🗑️");

      await fetchPosts();
    } catch (error) {
      console.error("Delete post error:", error);

      setMessage(
        error.message || "Unable to delete post."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalPosts = posts.length;

  const scheduledPosts = posts.filter(
    (post) =>
      post.status?.toLowerCase() === "scheduled" ||
      !post.status
  ).length;

  const publishedPosts = posts.filter(
    (post) =>
      post.status?.toLowerCase() === "published"
  ).length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">S</div>

          <div>
            <h2>SocialPilot</h2>
            <span>Smart Social Manager</span>
          </div>
        </div>

        <nav>

          <a className="active">
            <span>📊</span>
            Dashboard
          </a>

          <a>
            <span>📝</span>
            Posts
          </a>

          <a>
            <span>📅</span>
            Calendar
          </a>

          <a>
            <span>📈</span>
            Analytics
          </a>

          <a>
            <span>⚙️</span>
            Settings
          </a>

        </nav>

        <div className="sidebar-bottom">

          <div className="profile">

            <div className="avatar">
              SK
            </div>

            <div>
              <strong>Social Admin</strong>
              <small>Admin</small>
            </div>

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="topbar">

          <div>
            <h1>Dashboard</h1>

            <p>
              Manage and schedule your social media content
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchPosts}
            disabled={loading}
          >
            🔄 Refresh
          </button>

        </header>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon blue">
              📝
            </div>

            <div>
              <span>Total Posts</span>
              <h2>{totalPosts}</h2>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon purple">
              📅
            </div>

            <div>
              <span>Scheduled</span>
              <h2>{scheduledPosts}</h2>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">
              🚀
            </div>

            <div>
              <span>Published</span>
              <h2>{publishedPosts}</h2>
            </div>

          </div>

        </section>

        {/* =================================================
            CONTENT GRID
        ================================================= */}

        <section className="dashboard-grid">

          {/* =================================================
              CREATE POST
          ================================================= */}

          <div className="card create-card">

            <div className="card-header">

              <div>

                <h2>Create New Post</h2>

                <p>
                  Create and schedule your next social media
                  post.
                </p>

              </div>

              <span className="header-icon">
                ✏️
              </span>

            </div>

            <form onSubmit={handleSubmit}>

              <label htmlFor="content">
                Post Content
              </label>

              <textarea
                id="content"
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="What would you like to share?"
                rows={6}
              />

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="platform">
                    Platform
                  </label>

                  <select
                    id="platform"
                    name="platform"
                    value={form.platform}
                    onChange={handleChange}
                  >

                    <option value="LinkedIn">
                      LinkedIn
                    </option>

                    <option value="Twitter">
                      Twitter
                    </option>

                    <option value="Facebook">
                      Facebook
                    </option>

                    <option value="Instagram">
                      Instagram
                    </option>

                  </select>

                </div>

                <div className="form-group">

                  <label htmlFor="scheduled_time">
                    Schedule Time
                  </label>

                  <input
                    id="scheduled_time"
                    type="datetime-local"
                    name="scheduled_time"
                    value={form.scheduled_time}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <button
                type="submit"
                className="schedule-btn"
                disabled={loading}
              >

                {loading
                  ? "Scheduling..."
                  : "📅 Schedule Post"}

              </button>

            </form>

          </div>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <div className="card quick-card">

            <div className="card-header">

              <div>

                <h2>Quick Actions</h2>

                <p>
                  Manage your social media workflow.
                </p>

              </div>

            </div>

            <div className="quick-actions">

              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector("textarea")
                    ?.focus()
                }
              >

                <span>➕</span>

                <div>
                  <strong>Create Post</strong>
                  <small>
                    Write a new social post
                  </small>
                </div>

              </button>

              <button
                type="button"
                onClick={fetchPosts}
                disabled={loading}
              >

                <span>🔄</span>

                <div>
                  <strong>Refresh Posts</strong>
                  <small>
                    Load latest posts
                  </small>
                </div>

              </button>

              <button type="button">

                <span>📊</span>

                <div>
                  <strong>View Analytics</strong>
                  <small>
                    Check your performance
                  </small>
                </div>

              </button>

              <button type="button">

                <span>⚙️</span>

                <div>
                  <strong>Settings</strong>
                  <small>
                    Configure SocialPilot
                  </small>
                </div>

              </button>

            </div>

          </div>

        </section>

        {/* =================================================
            RECENT POSTS
        ================================================= */}

        <section className="card posts-card">

          <div className="card-header posts-header">

            <div>

              <h2>Recent Posts</h2>

              <p>
                Your latest scheduled and published posts.
              </p>

            </div>

            <span className="post-count">
              {posts.length} Posts
            </span>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && posts.length === 0 ? (

            <div className="empty-state">

              <div className="loader"></div>

              <p>
                Loading posts...
              </p>

            </div>

          ) : posts.length === 0 ? (

            /* =================================================
               EMPTY
            ================================================= */

            <div className="empty-state">

              <div className="empty-icon">
                📝
              </div>

              <h3>
                No posts yet
              </h3>

              <p>
                Create your first social media post above.
              </p>

            </div>

          ) : (

            /* =================================================
               POSTS LIST
            ================================================= */

            <div className="posts-list">

              {posts.map((post) => (

                <div
                  className="post-item"
                  key={post.id}
                >

                  <div className="platform-icon">

                    {post.platform?.toLowerCase() ===
                    "linkedin"
                      ? "in"
                      : post.platform?.toLowerCase() ===
                        "twitter"
                      ? "𝕏"
                      : post.platform?.toLowerCase() ===
                        "instagram"
                      ? "◎"
                      : "f"}

                  </div>

                  <div className="post-content">

                    <div className="post-top">

                      <strong>
                        {post.platform ||
                          "Social Media"}
                      </strong>

                      <span
                        className={`status ${
                          post.status
                            ? post.status.toLowerCase()
                            : "scheduled"
                        }`}
                      >

                        {post.status ||
                          "Scheduled"}

                      </span>

                    </div>

                    <p>
                      {post.content}
                    </p>

                    <small>

                      📅{" "}

                      {post.scheduled_time
                        ? new Date(
                            post.scheduled_time
                          ).toLocaleString()
                        : "No schedule time"}

                    </small>

                  </div>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() =>
                      deletePost(post.id)
                    }
                    title="Delete post"
                  >
                    🗑️
                  </button>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer>

          <p>
            © 2026 SocialPilot • Intelligent Social Media
            Scheduling Platform
          </p>

        </footer>

      </main>

    </div>
  );
}

export default App;