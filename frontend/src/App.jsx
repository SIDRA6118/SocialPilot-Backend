import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Login from "./Login";
import Register from "./Register";

const API_URL = "http://127.0.0.1:8000/api/posts/";
const REFRESH_URL = "http://127.0.0.1:8000/api/token/refresh/";

const SOCIAL_PLATFORMS = [
  { name: "LinkedIn", icon: "in", color: "#0a66c2", description: "Professional updates and company pages" },
  { name: "Twitter", icon: "𝕏", color: "#111827", description: "Short-form posts and real-time conversations" },
  { name: "Facebook", icon: "f", color: "#1877f2", description: "Pages, communities, and audience updates" },
  { name: "Instagram", icon: "◎", color: "#d62976", description: "Visual stories, posts, and brand moments" },
  { name: "YouTube", icon: "▶", color: "#ff0000", description: "Video publishing and channel management" },
  { name: "Pinterest", icon: "P", color: "#bd081c", description: "Pins, boards, and visual discovery" },
];

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

  try {
    const response = await fetch(REFRESH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    });

    if (!response.ok) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return false;
    }

    const data = await response.json();

    if (!data.access) {
      localStorage.removeItem("access_token");
      return false;
    }

    localStorage.setItem("access_token", data.access);

    return true;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
};

const requestWithAuth = async (url, options = {}) => {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {}),
        },
      });
    }
  }

  return response;
};

function MessageBox({ message }) {
  if (!message) {
    return null;
  }

  return <div className="message">{message}</div>;
}

function App() {
  // =====================================================
  // AUTHENTICATION
  // =====================================================

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access_token")
  );

  const [authScreen, setAuthScreen] = useState("login");

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // =====================================================
  // STATE
  // =====================================================

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [editingPost, setEditingPost] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [currentDate, setCurrentDate] = useState(
    new Date()
  );

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("socialpilot_theme") === "dark"
  );

  const [notifications, setNotifications] = useState(
    localStorage.getItem("socialpilot_notifications") !==
      "false"
  );

  const [connectedPlatforms, setConnectedPlatforms] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("socialpilot_connected_platforms") || "{}"
      );
    } catch {
      return {};
    }
  });

  const [form, setForm] = useState({
    content: "",
    platform: "LinkedIn",
    scheduled_time: "",
  });

  // =====================================================
  // FETCH POSTS
  // =====================================================

  const fetchPosts = useCallback(async () => {
    if (!localStorage.getItem("access_token")) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await requestWithAuth(API_URL, {
        method: "GET",
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log("GET /api/posts/ response:", data);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setIsAuthenticated(false);

          throw new Error(
            "Session expired. Please login again."
          );
        }

        throw new Error(
          data.detail ||
            data.message ||
            "Failed to fetch posts."
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
        error.message ||
          "Unable to connect with Django backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const fetchTimer = window.setTimeout(() => {
      fetchPosts();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, [isAuthenticated, fetchPosts]);

  // =====================================================
  // THEME
  // =====================================================

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);

    localStorage.setItem(
      "socialpilot_theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      content: "",
      platform: "LinkedIn",
      scheduled_time: "",
    });

    setEditingPost(null);
  };

  // =====================================================
  // CREATE / UPDATE POST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!form.content.trim()) {
      setMessage("Please enter post content.");
      return;
    }

    if (!form.scheduled_time) {
      setMessage(
        "Please select schedule date and time."
      );
      return;
    }

    if (!localStorage.getItem("access_token")) {
      setMessage(
        "Please login before managing posts."
      );
      setIsAuthenticated(false);
      return;
    }

    try {
      setLoading(true);

      const postData = {
        content: form.content.trim(),
        platform: form.platform,
        scheduled_time: new Date(
          form.scheduled_time
        ).toISOString(),
      };

      let response;

      if (editingPost) {
        response = await requestWithAuth(
          `${API_URL}${editingPost.id}/`,
          {
            method: "PATCH",
            body: JSON.stringify(postData),
          }
        );
      } else {
        response = await requestWithAuth(API_URL, {
          method: "POST",
          body: JSON.stringify(postData),
        });
      }

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log("Post API response:", data);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setIsAuthenticated(false);

          throw new Error(
            "Session expired. Please login again."
          );
        }

        if (response.status === 400) {
          throw new Error(
            data.detail ||
              data.message ||
              "Invalid post data."
          );
        }

        throw new Error(
          data.detail ||
            data.message ||
            "Post operation failed."
        );
      }

      setMessage(
        editingPost
          ? "Post updated successfully! ✨"
          : "Post scheduled successfully! 🎉"
      );

      resetForm();

      await fetchPosts();

      setActivePage("posts");
    } catch (error) {
      console.error("Post operation error:", error);

      setMessage(
        error.message ||
          "Failed to save the post."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EDIT POST
  // =====================================================

  const startEdit = (post) => {
    setEditingPost(post);

    let formattedDate = "";

    if (post.scheduled_time) {
      const date = new Date(post.scheduled_time);

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        date.getDate()
      ).padStart(2, "0");

      const hours = String(
        date.getHours()
      ).padStart(2, "0");

      const minutes = String(
        date.getMinutes()
      ).padStart(2, "0");

      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setForm({
      content: post.content || "",
      platform: post.platform || "LinkedIn",
      scheduled_time: formattedDate,
    });

    setActivePage("dashboard");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

      const response = await requestWithAuth(
        `${API_URL}${id}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setIsAuthenticated(false);

          throw new Error(
            "Session expired. Please login again."
          );
        }

        throw new Error(
          data.detail ||
            data.message ||
            "Delete failed."
        );
      }

      setMessage(
        "Post deleted successfully. 🗑️"
      );

      await fetchPosts();
    } catch (error) {
      console.error("Delete error:", error);

      setMessage(
        error.message ||
          "Unable to delete post."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setPosts([]);
    setEditingPost(null);
    setActivePage("dashboard");
    setMessage("");
    setIsAuthenticated(false);
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalPosts = posts.length;

  const scheduledPosts = posts.filter(
    (post) =>
      (post.status || "scheduled").toLowerCase() ===
      "scheduled"
  ).length;

  const publishedPosts = posts.filter(
    (post) =>
      (post.status || "").toLowerCase() ===
      "published"
  ).length;

  const failedPosts = posts.filter(
    (post) =>
      (post.status || "").toLowerCase() ===
      "failed"
  ).length;

  // =====================================================
  // PLATFORM STATISTICS
  // =====================================================

  const platformStats = useMemo(() => {
    const stats = {
      LinkedIn: 0,
      Twitter: 0,
      Facebook: 0,
      Instagram: 0,
      YouTube: 0,
      Pinterest: 0,
    };

    posts.forEach((post) => {
      const platform = post.platform;

      if (stats[platform] !== undefined) {
        stats[platform]++;
      }
    });

    return stats;
  }, [posts]);

  // =====================================================
  // FILTERED POSTS
  // =====================================================

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        !searchTerm ||
        post.content
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesPlatform =
        platformFilter === "All" ||
        post.platform === platformFilter;

      const postStatus =
        post.status || "scheduled";

      const matchesStatus =
        statusFilter === "All" ||
        postStatus.toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesPlatform &&
        matchesStatus
      );
    });
  }, [
    posts,
    searchTerm,
    platformFilter,
    statusFilter,
  ]);

  // =====================================================
  // CALENDAR
  // =====================================================

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    return cells;
  }, [currentDate]);

  const getPostsForDay = (day) => {
    if (!day) {
      return [];
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return posts.filter((post) => {
      if (!post.scheduled_time) {
        return false;
      }

      const date = new Date(
        post.scheduled_time
      );

      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      )
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const togglePlatformConnection = (platform) => {
    setConnectedPlatforms((previousPlatforms) => {
      const nextPlatforms = { ...previousPlatforms };

      if (nextPlatforms[platform.name]) {
        delete nextPlatforms[platform.name];
        setMessage(`${platform.name} disconnected.`);
      } else {
        nextPlatforms[platform.name] = {
          accountName: `${platform.name} account`,
          connectedAt: new Date().toISOString(),
        };
        setMessage(`${platform.name} connected successfully.`);
      }

      localStorage.setItem(
        "socialpilot_connected_platforms",
        JSON.stringify(nextPlatforms)
      );

      return nextPlatforms;
    });
  };

  // =====================================================
  // PAGE TITLES
  // =====================================================

  const pageTitle = {
    dashboard: "Dashboard",
    posts: "Posts",
    calendar: "Calendar",
    analytics: "Analytics",
    settings: "Settings",
  };

  const pageDescription = {
    dashboard:
      "Manage and schedule your social media content",
    posts:
      "View, search, edit and manage all your posts",
    calendar:
      "View your scheduled content by date",
    analytics:
      "Track your social media scheduling performance",
    settings:
      "Manage your SocialPilot preferences",
  };

  // =====================================================
  // PLATFORM ICON
  // =====================================================

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case "linkedin":
        return "in";

      case "twitter":
        return "𝕏";

      case "instagram":
        return "◎";

      case "facebook":
        return "f";

      default:
        return "📱";
    }
  };

  // =====================================================
  // POST ITEM
  // =====================================================

  const PostItem = ({ post }) => {
    return (
      <div className="post-item">
        <div className="platform-icon">
          {getPlatformIcon(post.platform)}
        </div>

        <div className="post-content">
          <div className="post-top">
            <strong>
              {post.platform || "Social Media"}
            </strong>

            <span
              className={`status ${
                (
                  post.status || "scheduled"
                ).toLowerCase()
              }`}
            >
              {post.status || "Scheduled"}
            </span>
          </div>

          <p>{post.content}</p>

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
          onClick={() => startEdit(post)}
          title="Edit post"
        >
          ✏️
        </button>

        <button
          type="button"
          className="delete-btn"
          onClick={() => deletePost(post.id)}
          title="Delete post"
        >
          🗑️
        </button>
      </div>
    );
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  const DashboardPage = () => {
    return (
      <>
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

        <section className="dashboard-grid">
          <div className="card create-card">
            <div className="card-header">
              <div>
                <h2>
                  {editingPost
                    ? "Edit Post"
                    : "Create New Post"}
                </h2>

                <p>
                  {editingPost
                    ? "Update your scheduled social media post."
                    : "Create and schedule your next social media post."}
                </p>
              </div>

              <span className="header-icon">
                {editingPost ? "✏️" : "📝"}
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

                    <option value="YouTube">
                      YouTube
                    </option>

                    <option value="Pinterest">
                      Pinterest
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
                  ? "Saving..."
                  : editingPost
                  ? "✏️ Update Post"
                  : "📅 Schedule Post"}
              </button>

              {editingPost && (
                <button
                  type="button"
                  className="refresh-btn"
                  style={{
                    width: "100%",
                    marginTop: "10px",
                  }}
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

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
                onClick={() => {
                  resetForm();

                  setTimeout(() => {
                    document
                      .querySelector("textarea")
                      ?.focus();
                  }, 0);
                }}
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

              <button
                type="button"
                onClick={() =>
                  setActivePage("calendar")
                }
              >
                <span>📅</span>

                <div>
                  <strong>View Calendar</strong>

                  <small>
                    Check scheduled content
                  </small>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActivePage("analytics")
                }
              >
                <span>📊</span>

                <div>
                  <strong>View Analytics</strong>

                  <small>
                    Check your performance
                  </small>
                </div>
              </button>
            </div>
          </div>
        </section>

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

          {loading && posts.length === 0 ? (
            <div className="empty-state">
              <div className="loader"></div>

              <p>Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                📝
              </div>

              <h3>No posts yet</h3>

              <p>
                Create your first social media post above.
              </p>
            </div>
          ) : (
            <div className="posts-list">
              {posts
                .slice()
                .sort(
                  (a, b) =>
                    new Date(
                      b.created_at ||
                        b.scheduled_time
                    ) -
                    new Date(
                      a.created_at ||
                        a.scheduled_time
                    )
                )
                .slice(0, 5)
                .map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                  />
                ))}
            </div>
          )}

          {posts.length > 5 && (
            <button
              type="button"
              className="refresh-btn"
              style={{
                width: "100%",
                marginTop: "15px",
              }}
              onClick={() =>
                setActivePage("posts")
              }
            >
              View All Posts →
            </button>
          )}
        </section>
      </>
    );
  };

  // =====================================================
  // POSTS PAGE
  // =====================================================

  const PostsPage = () => {
    return (
      <section className="card posts-card">
        <div className="card-header posts-header">
          <div>
            <h2>All Posts</h2>

            <p>
              Search and manage all your social media posts.
            </p>
          </div>

          <span className="post-count">
            {filteredPosts.length} Posts
          </span>
        </div>

        <div
          className="form-row"
          style={{
            marginBottom: "20px",
          }}
        >
          <div className="form-group">
            <label>Search</label>

            <input
              type="text"
              placeholder="Search post content..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>Platform</label>

            <select
              value={platformFilter}
              onChange={(e) =>
                setPlatformFilter(e.target.value)
              }
            >
              <option value="All">All Platforms</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Twitter">Twitter</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">
                Instagram
              </option>
              <option value="YouTube">YouTube</option>
              <option value="Pinterest">Pinterest</option>
            </select>
          </div>
        </div>

        <div
          className="form-group"
          style={{
            marginBottom: "20px",
          }}
        >
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="All">All Statuses</option>
            <option value="scheduled">
              Scheduled
            </option>
            <option value="published">
              Published
            </option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              🔍
            </div>

            <h3>No posts found</h3>

            <p>
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="posts-list">
            {filteredPosts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  // =====================================================
  // CALENDAR PAGE
  // =====================================================

  const CalendarPage = () => {
    const monthName =
      currentDate.toLocaleString("default", {
        month: "long",
      });

    const year = currentDate.getFullYear();

    return (
      <section className="card posts-card">
        <div className="card-header posts-header">
          <div>
            <h2>
              {monthName} {year}
            </h2>

            <p>
              Your scheduled social media content.
            </p>
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={goToToday}
          >
            Today
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            className="refresh-btn"
            onClick={previousMonth}
          >
            ← Previous
          </button>

          <strong>
            {monthName} {year}
          </strong>

          <button
            type="button"
            className="refresh-btn"
            onClick={nextMonth}
          >
            Next →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(7, 1fr)",
            gap: "8px",
          }}
        >
          {[
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
          ].map((day) => (
            <div
              key={day}
              style={{
                padding: "10px",
                textAlign: "center",
                fontWeight: "700",
                color: "#64748b",
              }}
            >
              {day}
            </div>
          ))}

          {calendarData.map(
            (day, index) => {
              const dayPosts =
                getPostsForDay(day);

              return (
                <div
                  key={index}
                  style={{
                    minHeight: "110px",
                    padding: "8px",
                    border:
                      "1px solid #e3e7ee",
                    borderRadius: "10px",
                    background: day
                      ? "#ffffff"
                      : "#f8fafc",
                  }}
                >
                  {day && (
                    <>
                      <strong>
                        {day}
                      </strong>

                      <div
                        style={{
                          marginTop: "7px",
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: "5px",
                        }}
                      >
                        {dayPosts.map(
                          (post) => (
                            <div
                              key={post.id}
                              style={{
                                padding:
                                  "5px 7px",
                                borderRadius:
                                  "6px",
                                background:
                                  "#eef2ff",
                                color:
                                  "#3730a3",
                                fontSize:
                                  "10px",
                                cursor:
                                  "pointer",
                              }}
                              title={
                                post.content
                              }
                              onClick={() =>
                                startEdit(
                                  post
                                )
                              }
                            >
                              <strong>
                                {
                                  post.platform
                                }
                              </strong>

                              <br />

                              {new Date(
                                post.scheduled_time
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>
    );
  };

  // =====================================================
  // ANALYTICS PAGE
  // =====================================================

  const AnalyticsPage = () => {
    return (
      <>
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

        <section className="dashboard-grid">
          <div className="card posts-card">
            <div className="card-header">
              <div>
                <h2>Platform Performance</h2>

                <p>
                  Number of posts scheduled for each platform.
                </p>
              </div>

              <span className="header-icon">
                📊
              </span>
            </div>

            {Object.entries(
              platformStats
            ).map(([platform, count]) => {
              const percentage =
                totalPosts > 0
                  ? Math.round(
                      (count /
                        totalPosts) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={platform}
                  style={{
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: "7px",
                    }}
                  >
                    <strong>
                      {platform}
                    </strong>

                    <span>
                      {count} posts
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "9px",
                      borderRadius: "10px",
                      background:
                        "#e5e7eb",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        borderRadius:
                          "10px",
                        background:
                          "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      }}
                    />
                  </div>

                  <small
                    style={{
                      color: "#64748b",
                    }}
                  >
                    {percentage}% of total
                    posts
                  </small>
                </div>
              );
            })}
          </div>

          <div className="card posts-card">
            <div className="card-header">
              <div>
                <h2>Post Status</h2>

                <p>
                  Current status breakdown.
                </p>
              </div>

              <span className="header-icon">
                📈
              </span>
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

            <br />

            <div className="stat-card">
              <div className="stat-icon green">
                🚀
              </div>

              <div>
                <span>Published</span>
                <h2>{publishedPosts}</h2>
              </div>
            </div>

            <br />

            <div className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background: "#fee2e2",
                }}
              >
                ❌
              </div>

              <div>
                <span>Failed</span>
                <h2>{failedPosts}</h2>
              </div>
            </div>
          </div>
        </section>

        <section className="card posts-card">
          <div className="card-header">
            <div>
              <h2>Platform Summary</h2>

              <p>
                Complete platform-wise post statistics.
              </p>
            </div>
          </div>

          <div className="posts-list">
            {Object.entries(
              platformStats
            ).map(([platform, count]) => (
              <div
                className="post-item"
                key={platform}
              >
                <div className="platform-icon">
                  {getPlatformIcon(
                    platform
                  )}
                </div>

                <div className="post-content">
                  <strong>
                    {platform}
                  </strong>

                  <p>
                    {count} post
                    {count !== 1
                      ? "s"
                      : ""}{" "}
                    scheduled
                  </p>
                </div>

                <span className="post-count">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  };

  // =====================================================
  // SETTINGS PAGE
  // =====================================================

  const SettingsPage = () => {
    const username =
      localStorage.getItem("username") ||
      "Social Admin";

    const email =
      localStorage.getItem("email") ||
      "Admin Account";

    const savePreferences = () => {
      localStorage.setItem(
        "socialpilot_notifications",
        notifications ? "true" : "false"
      );

      setMessage(
        "Settings saved successfully! ⚙️"
      );
    };

    return (
      <section className="card create-card">
        <div className="card-header">
          <div>
            <h2>Settings</h2>

            <p>
              Manage your SocialPilot account and preferences.
            </p>
          </div>

          <span className="header-icon">
            ⚙️
          </span>
        </div>

        <div
          style={{
            padding: "18px",
            border:
              "1px solid #e7ebf1",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              marginBottom: "15px",
            }}
          >
            Profile
          </h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <div className="avatar">
              SK
            </div>

            <div>
              <strong>
                {username}
              </strong>

              <small
                style={{
                  display: "block",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                {email}
              </small>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            border:
              "1px solid #e7ebf1",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              marginBottom: "15px",
            }}
          >
            Preferences
          </h3>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) =>
                setNotifications(
                  e.target.checked
                )
              }
              style={{
                width: "auto",
              }}
            />

            Enable notifications
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) =>
                setDarkMode(
                  e.target.checked
                )
              }
              style={{
                width: "auto",
              }}
            />

            Dark mode
          </label>
        </div>

        <div className="integration-section">
          <div className="integration-heading">
            <div>
              <h3>Social accounts</h3>
              <p>Connect the channels you use to publish and monitor content.</p>
            </div>
            <span className="integration-count">
              {Object.keys(connectedPlatforms).length}/{SOCIAL_PLATFORMS.length} connected
            </span>
          </div>

          <div className="integration-grid">
            {SOCIAL_PLATFORMS.map((platform) => {
              const account = connectedPlatforms[platform.name];

              return (
                <div className={`integration-card ${account ? "is-connected" : ""}`} key={platform.name}>
                  <div className="integration-card-top">
                    <span
                      className="integration-icon"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </span>
                    <span className={`connection-status ${account ? "connected" : "available"}`}>
                      <span className="status-dot"></span>
                      {account ? "Connected" : "Available"}
                    </span>
                  </div>

                  <strong>{platform.name}</strong>
                  <p>{account ? account.accountName : platform.description}</p>

                  <button
                    type="button"
                    className={account ? "disconnect-button" : "connect-button"}
                    onClick={() => togglePlatformConnection(platform)}
                  >
                    {account ? "Disconnect" : "Connect account"}
                  </button>
                </div>
              );
            })}
          </div>
          <small className="integration-note">
            Connections are saved for this browser. Provider OAuth credentials can be enabled from the backend when available.
          </small>
        </div>

        <button
          type="button"
          className="schedule-btn"
          onClick={savePreferences}
        >
          💾 Save Settings
        </button>

        <button
          type="button"
          className="refresh-btn"
          style={{
            width: "100%",
            marginTop: "12px",
            color: "#dc2626",
          }}
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </section>
    );
  };

  // =====================================================
  // PAGE ROUTING
  // =====================================================

  const renderPage = () => {
    switch (activePage) {
      case "posts":
        return <PostsPage />;

      case "calendar":
        return <CalendarPage />;

      case "analytics":
        return <AnalyticsPage />;

      case "settings":
        return <SettingsPage />;

      case "dashboard":
      default:
        return <DashboardPage />;
    }
  };

  // =====================================================
  // SHOW LOGIN IF NOT AUTHENTICATED
  // =====================================================

  if (!isAuthenticated) {
    if (authScreen === "register") {
      return (
        <Register
          onRegister={() => setAuthScreen("login")}
          onBackToLogin={() => setAuthScreen("login")}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setAuthScreen("register")}
      />
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="app">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">
            S
          </div>

          <div>
            <h2>SocialPilot</h2>

            <span>
              Smart Social Manager
            </span>
          </div>
        </div>

        <nav>
          <a
            href="#"
            className={
              activePage === "dashboard"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("dashboard");
            }}
          >
            <span>📊</span>
            Dashboard
          </a>

          <a
            href="#"
            className={
              activePage === "posts"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("posts");
            }}
          >
            <span>📝</span>
            Posts
          </a>

          <a
            href="#"
            className={
              activePage === "calendar"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("calendar");
            }}
          >
            <span>📅</span>
            Calendar
          </a>

          <a
            href="#"
            className={
              activePage === "analytics"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("analytics");
            }}
          >
            <span>📈</span>
            Analytics
          </a>

          <a
            href="#"
            className={
              activePage === "settings"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("settings");
            }}
          >
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
              <strong>
                Social Admin
              </strong>

              <small>
                Admin
              </small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main">
        <header className="topbar">
          <div>
            <h1>
              {pageTitle[activePage]}
            </h1>

            <p>
              {pageDescription[activePage]}
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

        <MessageBox message={message} />

        {renderPage()}

        <footer>
          <p>
            © 2026 SocialPilot • Intelligent
            Social Media Scheduling Platform
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
