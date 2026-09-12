import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import "./App.css";
import Login from "./Login";
import Register from "./Register";
import PrivacyPolicy from "./PrivacyPolicy";

const API_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/posts/";

const SOCIAL_ACCOUNTS_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/social-accounts/";

const TEAM_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/team-members/";

const REFRESH_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/token/refresh/";

const LINKEDIN_CONNECT_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/linkedin/connect/";

const FACEBOOK_CONNECT_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/facebook/connect/";

const INSTAGRAM_CONNECT_URL =
  "https://socialpilot-backend-mipp.onrender.com/api/instagram/connect/";

const SOCIAL_PLATFORMS = [
  { name: "LinkedIn", icon: "in", color: "#0a66c2", description: "Professional updates and company pages" },
  { name: "Twitter", icon: "𝕏", color: "#111827", description: "Short-form posts and real-time conversations" },
  { name: "Facebook", icon: "f", color: "#1877f2", description: "Pages, communities, and audience updates" },
  { name: "Instagram", icon: "◎", color: "#d62976", description: "Visual stories, posts, and brand moments" },
  { name: "YouTube", icon: "▶", color: "#ff0000", description: "Video publishing and channel management" },
  { name: "Pinterest", icon: "P", color: "#bd081c", description: "Pins, boards, and visual discovery" },
];

const ROLE_LABELS = {
  creator: "Content Creator",
  marketing: "Marketing Team",
  business: "Business User",
  administrator: "Administrator",
};

const ROLE_PERMISSIONS = {
  creator: ["view_posts", "create_post", "edit_post", "delete_post", "view_analytics"],
  marketing: ["view_posts", "create_post", "edit_post", "delete_post", "view_analytics"],
  business: ["view_posts", "view_analytics", "connect_channels"],
  administrator: ["view_posts", "create_post", "edit_post", "delete_post", "view_analytics", "connect_channels", "manage_team", "view_team", "manage_settings"],
};

const canUserAccess = (role, permission) => {
  const normalizedRole = (role || "administrator").toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole]?.includes(permission) || false;
};

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  Tooltip
);

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

function PlatformIcon({ platform, className = "" }) {
  const normalizedPlatform = platform?.toLowerCase();

  if (normalizedPlatform === "linkedin") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M5.1 7.2A2.1 2.1 0 1 0 5.1 3a2.1 2.1 0 0 0 0 4.2ZM3.3 21h3.6V9H3.3v12ZM9 9v12h3.6v-6.6c0-1.7.3-3.4 2.5-3.4 2.1 0 2.1 2 2.1 3.5V21H21v-7.2c0-3.5-.7-6.2-4.7-6.2-1.9 0-3.2 1-3.7 1.9h-.1V9H9Z" />
      </svg>
    );
  }

  if (normalizedPlatform === "twitter") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-5-6.5L6.2 22H3.1l7.3-8.4L2.4 2h6.4l4.5 5.9L18.9 2Zm-1.1 17.8h1.7L7.9 4.1H6.1l11.7 15.7Z" />
      </svg>
    );
  }

  if (normalizedPlatform === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M13.7 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H8v3.1h2.5v8h3.2Z" />
      </svg>
    );
  }

  if (normalizedPlatform === "instagram") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (normalizedPlatform === "youtube") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M21.6 7.2a2.9 2.9 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2A30.2 30.2 0 0 0 2 12a30.2 30.2 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2A30.2 30.2 0 0 0 22 12a30.2 30.2 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2.5c-5.2 0-8.4 3.7-8.4 7.7 0 3.1 1.8 5.8 4.5 6.8-.1-.6-.2-1.5 0-2.2l1-4.1s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.8 1.5 1.7 0 1-.6 2.4-.9 3.7-.3 1.1.5 2 1.6 2 1.9 0 3.3-2 3.3-4.9 0-2.6-1.9-4.4-4.6-4.4-3.1 0-5 2.3-5 4.7 0 .9.3 1.9.8 2.4.1.1.1.2.1.4l-.3 1.2c-.1.4-.4.5-.8.3-1.5-.7-2.4-2.8-2.4-4.5 0-3.7 2.7-7.1 7.8-7.1 4.1 0 7.2 2.9 7.2 6.7 0 4-2.5 7.2-6 7.2-1.2 0-2.4-.6-2.8-1.3l-.7 2.7c-.3 1-.9 2.2-1.3 2.9 1 .3 2 .5 3.1.5 5.2 0 9.4-4.2 9.4-9.4S17.2 2.5 12 2.5Z" />
    </svg>
  );
}

function PageRenderer({ renderPage }) {
  return renderPage();
}

function MetricCard({ icon, tone, label, value, detail, trend }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          <b>{trend}</b> {detail}
        </small>
      </div>
    </article>
  );
}

function LivePostPreview({ form, profile }) {
  const previewDate = form.scheduled_time
    ? new Date(form.scheduled_time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Just now";

  return (
    <section className="card live-preview-card">
      <div className="card-header posts-header">
        <div>
          <span className="section-kicker">LIVE PREVIEW</span>
          <h2>See it before it goes live</h2>
          <p>Your post preview updates as you write.</p>
        </div>
        <span className="preview-platform-label"><PlatformIcon platform={form.platform} /> {form.platform}</span>
      </div>
      <div className="social-preview">
        <div className="social-preview-header">
          <span className="preview-avatar">{profile.username.slice(0, 2).toUpperCase()}</span>
          <div><strong>{profile.username}</strong><small>{form.platform} · {previewDate}</small></div>
          <b>•••</b>
        </div>
        <p className="social-preview-content">{form.content || "Your post preview will appear here..."}</p>
        {form.media_url ? (
          <img className="social-preview-media" src={form.media_url} alt="Post media preview" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="social-preview-placeholder"><span>＋</span><small>Add a media URL to preview your creative</small></div>
        )}
        <div className="social-preview-actions"><span>♡ Like</span><span>◌ Comment</span><span>↗ Share</span><span>⌑ Save</span></div>
      </div>
    </section>
  );
}

function App() {
  // =====================================================
  // AUTHENTICATION
  // =====================================================

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access_token")
  );

  const [authScreen, setAuthScreen] = useState("login");

  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("socialpilot_accounts") || "[]");
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState(() => ({
    username: localStorage.getItem("username") || "Social Admin",
    email: localStorage.getItem("email") || "",
  }));

  const [userRole, setUserRole] = useState(() => {
    const storedRole = localStorage.getItem("socialpilot_role");
    return storedRole || "administrator";
  });

  const [profileDraft, setProfileDraft] = useState(profile);
  const [editingProfile, setEditingProfile] = useState(false);

  const canAccess = useCallback(
    (permission) => canUserAccess(userRole, permission),
    [userRole]
  );

  const syncUserRole = useCallback((nextRole) => {
    const normalizedRole = ROLE_LABELS[nextRole] ? nextRole : "administrator";
    setUserRole(normalizedRole);
    localStorage.setItem("socialpilot_role", normalizedRole);
  }, []);

  const handleLogin = (account) => {
    const nextRole = account.role || userRole || "administrator";
    syncUserRole(nextRole);
    localStorage.setItem("username", account.username);
    setProfile((previousProfile) => ({
      ...previousProfile,
      username: account.username,
    }));

    setSavedAccounts((previousAccounts) => {
      const nextAccounts = [
        { ...account, role: nextRole },
        ...previousAccounts.filter(
          (savedAccount) => savedAccount.username !== account.username
        ),
      ];
      localStorage.setItem("socialpilot_accounts", JSON.stringify(nextAccounts));
      return nextAccounts;
    });
    setIsAuthenticated(true);
  };

  const handleSelectAccount = (account) => {
    localStorage.setItem("access_token", account.access);
    localStorage.setItem("refresh_token", account.refresh);
    syncUserRole(account.role || "administrator");
    handleLogin(account);
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("socialpilot_role");
    setUserRole("administrator");
    setPosts([]);
    setEditingPost(null);
    setAuthScreen("login");
    setIsAuthenticated(false);
  };

  const handleRemoveAccount = (username) => {
    setSavedAccounts((previousAccounts) => {
      const nextAccounts = previousAccounts.filter(
        (account) => account.username !== username
      );
      localStorage.setItem("socialpilot_accounts", JSON.stringify(nextAccounts));
      return nextAccounts;
    });
  };

  const startProfileEdit = () => {
    setProfileDraft(profile);
    setEditingProfile(true);
  };

  const saveProfile = (event) => {
    event.preventDefault();

    const nextProfile = {
      username: profileDraft.username.trim() || "Social Admin",
      email: profileDraft.email.trim(),
    };

    localStorage.setItem("username", nextProfile.username);
    localStorage.setItem("email", nextProfile.email);
    setProfile(nextProfile);
    setProfileDraft(nextProfile);
    setEditingProfile(false);
    setMessage("Profile details saved successfully.");
  };

  // =====================================================
  // STATE
  // =====================================================

  const [posts, setPosts] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
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

  const [form, setForm] = useState({
    content: "",
    platform: "LinkedIn",
    content_type: "text",
    media_url: "",
    scheduled_time: "",
    status: "scheduled",
    is_recurring: false,
    recurrence: "weekly",
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
  }, [setIsAuthenticated, setLoading, setMessage, setPosts]);

  const fetchModuleData = useCallback(async () => {
    if (!localStorage.getItem("access_token")) return;
    try {
      const [accountsResponse, teamResponse] = await Promise.all([
        requestWithAuth(SOCIAL_ACCOUNTS_URL),
        requestWithAuth(TEAM_URL),
      ]);
      const accounts = await accountsResponse.json();
      const team = await teamResponse.json();
      setSocialAccounts(Array.isArray(accounts) ? accounts : accounts.results || []);
      setTeamMembers(Array.isArray(team) ? team : team.results || []);
    } catch (error) {
      console.error("Module data error:", error);
    }
  }, [setSocialAccounts, setTeamMembers]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const fetchTimer = window.setTimeout(() => {
      fetchPosts();
      fetchModuleData();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, [isAuthenticated, fetchPosts, fetchModuleData]);

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
      content_type: "text",
      media_url: "",
      scheduled_time: "",
      status: "scheduled",
      is_recurring: false,
      recurrence: "weekly",
    });

    setEditingPost(null);
  };

  // =====================================================
  // CREATE / UPDATE POST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    if (editingPost ? !canAccess("edit_post") : !canAccess("create_post")) {
      setMessage("Your role does not allow managing posts.");
      return;
    }

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
        content_type: form.content_type,
        media_url: form.media_url.trim(),
        scheduled_time: new Date(
          form.scheduled_time
        ).toISOString(),
        status: form.status,
        is_recurring: form.is_recurring,
        recurrence: form.is_recurring ? form.recurrence : "",
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
    if (!canAccess("edit_post")) {
      setMessage("This role cannot edit scheduled posts.");
      return;
    }

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
      content_type: post.content_type || "text",
      media_url: post.media_url || "",
      scheduled_time: formattedDate,
      status: post.status || "scheduled",
      is_recurring: post.is_recurring || false,
      recurrence: post.recurrence || "weekly",
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
    if (!canAccess("delete_post")) {
      setMessage("Your role does not allow deleting posts.");
      return;
    }

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
  const connectLinkedIn = async () => {
  try {
    setMessage("Opening LinkedIn authorization...");

    const response = await requestWithAuth(LINKEDIN_CONNECT_URL, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          "LinkedIn authorization failed."
      );
    }

    if (!data.authorization_url) {
      throw new Error("Authorization URL missing from backend.");
    }

    window.location.assign(data.authorization_url);
  } catch (error) {
    console.error("LinkedIn connection error:", error);

    setMessage(
      error.message || "Unable to connect LinkedIn."
    );
  }
};

  const connectFacebook = async () => {
  try {
    setMessage("Opening Facebook authorization...");

    const response = await requestWithAuth(FACEBOOK_CONNECT_URL, {
      method: "GET",
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(
        data.detail ||
          data.message ||
          "Facebook authorization failed."
      );
    }

    if (!data.authorization_url) {
      throw new Error("Facebook authorization URL missing from backend.");
    }

    window.location.assign(data.authorization_url);
  } catch (error) {
    console.error("Facebook connection error:", error);

    setMessage(
      error.message || "Unable to connect Facebook."
    );
  }
};

  const connectInstagram = async () => {
  try {
    setMessage("Opening Instagram authorization...");

    const response = await requestWithAuth(INSTAGRAM_CONNECT_URL, {
      method: "GET",
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }

      throw new Error(
        data.detail ||
          data.message ||
          "Instagram authorization failed."
      );
    }

    if (!data.authorization_url) {
      throw new Error(
        "Instagram authorization URL missing from backend."
      );
    }

    window.location.assign(data.authorization_url);
  } catch (error) {
    console.error("Instagram connection error:", error);

    setMessage(
      error.message || "Unable to connect Instagram."
    );
  }
};

  const togglePlatformConnection = (platform) => {
  if (!canAccess("connect_channels")) {
    setMessage(
      "Your role does not allow connecting or disconnecting social accounts."
    );
    return;
  }

  const platformKey = platform.name.toLowerCase();

  const account = socialAccounts.find(
    (item) => item.platform === platformKey
  );

  // Already connected → disconnect
  if (account) {
    requestWithAuth(`${SOCIAL_ACCOUNTS_URL}${account.id}/`, {
      method: "DELETE",
    })
      .then(async (response) => {
        if (!response.ok) {
          // eslint-disable-next-line no-useless-assignment
          let data = {};

          try {
            data = await response.json();
          } catch {
            data = {};
          }

          throw new Error(
            data.detail ||
              data.message ||
              "Unable to disconnect this account."
          );
        }

        setSocialAccounts((items) =>
          items.filter((item) => item.id !== account.id)
        );

        setMessage(`${platform.name} disconnected.`);
      })
      .catch((error) => {
        console.error("Disconnect account error:", error);

        setMessage(
          error.message || "Unable to disconnect this account."
        );
      });

    return;
  }

  // LinkedIn → OAuth connection
  if (platformKey === "linkedin") {
    connectLinkedIn();
    return;
  }

  // Facebook → OAuth connection
  if (platformKey === "facebook") {
  connectFacebook();
  return;
  }

   // Instagram → OAuth connection
  if (platformKey === "instagram") {
  connectInstagram();
  return; 

}  
  // Other platforms → manual token connection
  const accountName = window.prompt(
    `Name for your ${platform.name} profile:`,
    `${platform.name} account`
  );

  const accessToken = window.prompt(
    "Provider access token (stored securely by the backend):"
  );

  if (!accountName || !accessToken) {
    return;
  }

  requestWithAuth(SOCIAL_ACCOUNTS_URL, {
    method: "POST",
    body: JSON.stringify({
      platform: platformKey,
      account_name: accountName,
      access_token: accessToken,
    }),
  })
    .then(async (response) => {
      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Account connection failed."
        );
      }

      setSocialAccounts((items) => [...items, data]);

      setMessage(`${platform.name} connected successfully.`);
    })
    .catch((error) => {
      console.error("Connect account error:", error);

      setMessage(
        error.message || "Unable to connect this account."
      );
    });
};
  const inviteTeamMember = async () => {
  if (!canAccess("manage_team")) {
    setMessage("Only administrators can invite team members.");
    return;
  }

  const email = window.prompt(
    "Enter the email address of the team member:"
  );

  if (!email || !email.trim()) {
    return;
  }

  const role = window.prompt(
    "Enter role: creator, marketing, business, or administrator",
    "creator"
  );

  const allowedRoles = [
    "creator",
    "marketing",
    "business",
    "administrator",
  ];

  const normalizedRole = (role || "creator").trim().toLowerCase();

  if (!allowedRoles.includes(normalizedRole)) {
    setMessage(
      "Invalid role. Use creator, marketing, business, or administrator."
    );
    return;
  }

  try {
    const response = await requestWithAuth(TEAM_URL, {
      method: "POST",
      body: JSON.stringify({
        invited_email: email.trim(),
        role: normalizedRole,
      }),
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          data.error ||
          "Unable to invite team member."
      );
    }

    setTeamMembers((members) => [...members, data]);

    setMessage(
      `Invitation created for ${email.trim()} successfully.`
    );
  } catch (error) {
    console.error("Invite team member error:", error);

    setMessage(
      error.message || "Unable to invite team member."
    );
  }
};
  const removeTeamMember = async (memberId) => {
    if (!canAccess("manage_team")) {
      setMessage("Only administrators can manage team members.");
      return;
    }

    try {
      const response = await requestWithAuth(`${TEAM_URL}${memberId}/`, { method: "DELETE" });
      if (!response.ok) throw new Error("Removal failed");
      setTeamMembers((members) => members.filter((member) => member.id !== memberId));
      setMessage("Team member removed.");
    } catch {
      setMessage("Unable to remove this team member.");
    }
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
      "Plan, publish, and manage every social moment from one workspace",
    posts:
      "Create, refine, and manage your publishing pipeline",
    calendar:
      "Keep your publishing rhythm clear and on track",
    analytics:
      "Understand your content mix and publishing performance",
    settings:
      "Shape your workspace, preferences, and connected channels",
  };

  // =====================================================
  // PLATFORM ICON
  // =====================================================

  // =====================================================
  // POST ITEM
  // =====================================================

  const PostItem = ({ post }) => {
    return (
      <div className="post-item">
        <div className="platform-icon">
          <PlatformIcon platform={post.platform} />
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
    const upcomingPosts = posts
      .filter((post) => post.scheduled_time && new Date(post.scheduled_time) >= new Date())
      .sort((first, second) => new Date(first.scheduled_time) - new Date(second.scheduled_time))
      .slice(0, 4);

    return (
      <>
        <section className="stats metric-grid">
          <MetricCard icon="✦" tone="blue" label="Total posts" value={totalPosts} trend="All time" detail="in your workspace" />
          <MetricCard icon="◷" tone="amber" label="Scheduled" value={scheduledPosts} trend="Ready" detail="to be published" />
          <MetricCard icon="↗" tone="green" label="Published" value={publishedPosts} trend="Live" detail="across your channels" />
          <MetricCard icon="◎" tone="rose" label="Connected" value={socialAccounts.length} trend="Active" detail="social accounts" />
          <MetricCard icon="♧" tone="violet" label="Team members" value={teamMembers.length} trend="Shared" detail="workspace collaborators" />
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
                    : "Turn a strong idea into a polished, ready-to-publish post."}
                </p>
              </div>

              <span className="header-icon">
                {editingPost ? "✏️" : "📝"}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="content">
                Post copy
              </label>

              <textarea
                id="content"
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="What would you like to share?"
                rows={6}
              />
              <div className="composer-meta"><span>Use a clear hook and one idea per post.</span><strong>{form.content.length}/2,200</strong></div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="content_type">Content type</label>
                  <select id="content_type" name="content_type" value={form.content_type} onChange={handleChange}>
                    <option value="text">Text post</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="carousel">Carousel</option>
                    <option value="story">Story</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="media_url">Media URL</label>
                  <input id="media_url" name="media_url" type="url" value={form.media_url} onChange={handleChange} placeholder="https://..." />
                </div>
              </div>

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
                <div className="form-group">
                  <label htmlFor="status">Workflow state</label>
                  <select id="status" name="status" value={form.status} onChange={handleChange}>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <label className="check-row">
                <input type="checkbox" name="is_recurring" checked={form.is_recurring} onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.checked }))} />
                Repeat this post
              </label>
              {form.is_recurring && (
                <select name="recurrence" value={form.recurrence} onChange={handleChange}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}

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
                  Keep your publishing workflow moving.
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
                    Start with a fresh idea
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
                    Sync your latest content
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
                    Review your publishing plan
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
                    Understand your content mix
                  </small>
                </div>
              </button>
            </div>
          </div>
        </section>

        <LivePostPreview form={form} profile={profile} />

        <section className="card posts-card">
          <div className="card-header posts-header">
            <div>
              <h2>Recent Posts</h2>

              <p>
                A focused view of your latest content.
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

        <section className="dashboard-lower-grid">
          <div className="card upcoming-card">
            <div className="card-header posts-header">
              <div>
                <span className="section-kicker">CONTENT QUEUE</span>
                <h2>Upcoming posts</h2>
                <p>Your next scheduled moments, ready at a glance.</p>
              </div>
              <button type="button" className="text-button" onClick={() => setActivePage("calendar")}>View calendar <span>→</span></button>
            </div>
            {upcomingPosts.length === 0 ? (
              <div className="compact-empty"><span>◷</span><p>No upcoming posts yet.</p></div>
            ) : (
              <div className="upcoming-list">
                {upcomingPosts.map((post) => (
                  <button type="button" className="upcoming-item" key={post.id} onClick={() => startEdit(post)}>
                    <span className="upcoming-platform"><PlatformIcon platform={post.platform} /></span>
                    <span className="upcoming-copy"><strong>{post.content || "Untitled post"}</strong><small>{post.platform} · {new Date(post.scheduled_time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></span>
                    <span className={`status ${(post.status || "scheduled").toLowerCase()}`}>{post.status || "Scheduled"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card dashboard-note-card">
            <span className="section-kicker">WORKSPACE NOTE</span>
            <h2>Consistency compounds.</h2>
            <p>Keep your publishing rhythm visible, then use Analytics to spot the channels that deserve more of your attention.</p>
            <button type="button" className="text-button note-link" onClick={() => setActivePage("analytics")}>Open analytics <span>→</span></button>
          </div>
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
          className="calendar-grid"
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
              className="calendar-weekday"
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
                  className={`calendar-cell ${day ? "has-day" : "is-empty"}`}
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
                              className="calendar-post"
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
    const chartLabels = Object.keys(platformStats);
    const platformChartData = {
      labels: chartLabels,
      datasets: [
        {
          label: "Posts",
          data: Object.values(platformStats),
          backgroundColor: ["#2563eb", "#111827", "#1877f2", "#d62976", "#ef4444", "#bd081c"],
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42,
        },
      ],
    };

    const statusChartData = {
      labels: ["Scheduled", "Published", "Failed"],
      datasets: [
        {
          data: [scheduledPosts, publishedPosts, failedPosts],
          backgroundColor: ["#f59e0b", "#22c55e", "#ef4444"],
          borderColor: "#ffffff",
          borderWidth: 4,
          hoverOffset: 8,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          padding: 10,
          callbacks: { label: (context) => `${context.parsed.y ?? context.parsed} posts` },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(148, 163, 184, 0.18)" } },
        x: { grid: { display: false } },
      },
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } },
        tooltip: { padding: 10 },
      },
    };

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

            <div className="analytics-chart analytics-bar-chart">
              <Bar data={platformChartData} options={chartOptions} />
            </div>
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

            <div className="analytics-chart analytics-doughnut-chart">
              <Doughnut data={statusChartData} options={doughnutOptions} />
              <strong className="chart-center-label">{totalPosts}<small>Total posts</small></strong>
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
                  <PlatformIcon platform={platform} />
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
              Manage your profile, workspace preferences, and channels.
            </p>
          </div>

          <span className="header-icon">
            ⚙️
          </span>
        </div>

        <section className="profile-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-eyebrow">ACCOUNT</span>
              <h3>Profile information</h3>
              <p>Keep your workspace identity up to date.</p>
            </div>
            {!editingProfile && (
              <button type="button" className="settings-edit-button" onClick={startProfileEdit}>
                Edit profile
              </button>
            )}
          </div>

          {editingProfile ? (
            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-form-row">
                <div className="form-group">
                  <label htmlFor="profile-username">Display name</label>
                  <input
                    id="profile-username"
                    value={profileDraft.username}
                    onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileDraft.email}
                    onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div className="profile-actions">
                <button type="submit" className="schedule-btn">Save profile</button>
                <button type="button" className="refresh-btn" onClick={() => setEditingProfile(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-summary">
              <div className="profile-summary-avatar">
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>{profile.username}</strong>
                <span>{profile.email || "Add an email address"}</span>
              </div>
              <span className="profile-badge">{ROLE_LABELS[userRole] || "Administrator"}</span>
            </div>
          )}
        </section>

        <section className="saved-signins-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-eyebrow">QUICK ACCESS</span>
              <h3>Saved sign-ins</h3>
              <p>Switch between trusted SocialPilot accounts on this device.</p>
            </div>
            <span className="saved-signins-count">{savedAccounts.length}</span>
          </div>

          {savedAccounts.length === 0 ? (
            <p className="saved-signins-empty">No saved accounts on this device.</p>
          ) : (
            <div className="saved-signins-list">
              {savedAccounts.map((account) => (
                <div className="saved-signin-row" key={account.username}>
                  <div className="saved-account-avatar">
                    {account.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="saved-signin-details">
                    <strong>{account.username}</strong>
                    <span>Saved sign-in token</span>
                  </div>
                  <button
                    type="button"
                    className="saved-account-remove"
                    onClick={() => handleRemoveAccount(account.username)}
                    title={`Remove ${account.username}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <small className="security-note">
            Passwords are never saved. Remove an account here to clear its saved sign-in from this browser.
          </small>
        </section>

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
              {socialAccounts.length}/{SOCIAL_PLATFORMS.length} connected
            </span>
          </div>

          <div className="integration-grid">
            {SOCIAL_PLATFORMS.map((platform) => {
              const account = socialAccounts.find((item) => item.platform === platform.name.toLowerCase());

              return (
                <div className={`integration-card ${account ? "is-connected" : ""}`} key={platform.name}>
                  <div className="integration-card-top">
                    <span
                      className="integration-icon"
                      style={{ backgroundColor: platform.color }}
                    >
                      <PlatformIcon platform={platform.name} />
                    </span>
                    <span className={`connection-status ${account ? "connected" : "available"}`}>
                      <span className="status-dot"></span>
                      {account ? "Connected" : "Available"}
                    </span>
                  </div>

                  <strong>{platform.name}</strong>
                  <p>{account ? account.account_name : platform.description}</p>

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

        <div className="team-section">
          <div className="integration-heading">
            <div>
              <h3>Team management</h3>
              <p>Invite collaborators and assign workspace roles.</p>
            </div>
            
            <button type="button" className="connect-button" onClick={inviteTeamMember} disabled={!canAccess("manage_team")}>Invite member</button>
          </div>
          {teamMembers.length === 0 ? (
            <p className="saved-signins-empty">No collaborators yet. You are the workspace owner.</p>
          ) : (
            <div className="saved-signins-list">
              {teamMembers.map((member) => (
                <div className="saved-signin-row" key={member.id}>
                  <div className="saved-account-avatar">{(member.username || member.invited_email).charAt(0).toUpperCase()}</div>
                  <div className="saved-signin-details">
                    <strong>{member.username || member.invited_email}</strong>
                    <span>{member.role} · {member.status}</span>
                  </div>
                  <button type="button" className="saved-account-remove" onClick={() => removeTeamMember(member.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
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

        <button
          type="button"
          className="refresh-btn"
          style={{
            width: "100%",
            marginTop: "10px",
          }}
          onClick={handleSwitchAccount}
        >
          ⇄ Switch account
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
        return <PageRenderer renderPage={PostsPage} />;

      case "calendar":
        return <PageRenderer renderPage={CalendarPage} />;

      case "analytics":
        return <PageRenderer renderPage={AnalyticsPage} />;

      case "settings":
        return <PageRenderer renderPage={SettingsPage} />;

      case "dashboard":
      default:
        return <PageRenderer renderPage={DashboardPage} />;
    }
  };

  if (window.location.pathname === "/privacy-policy") {
  return <PrivacyPolicy />;
}

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
        savedAccounts={savedAccounts}
        onSelectAccount={handleSelectAccount}
        onRemoveAccount={handleRemoveAccount}
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
              <strong>{profile.username}</strong>
              <small>
                {ROLE_LABELS[userRole] || "Administrator"}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-switch"
            onClick={handleSwitchAccount}
          >
            ⇄ Switch account
          </button>
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
          <div className="topbar-actions">
            <label className="topbar-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search posts"
                placeholder="Search posts"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  if (event.target.value && activePage !== "posts") setActivePage("posts");
                }}
              />
            </label>
            <button type="button" className="icon-button" title="Notifications" onClick={() => setMessage(notifications ? "You are all caught up." : "Notifications are disabled in Settings.")}>♢</button>
            <button type="button" className="topbar-profile" title="Open settings" onClick={() => setActivePage("settings")}>
              <span className="topbar-avatar">{profile.username.slice(0, 2).toUpperCase()}</span>
              <span>{profile.username}</span>
              <b>⌄</b>
            </button>
            <button
              className="refresh-btn topbar-refresh"
              onClick={fetchPosts}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
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
