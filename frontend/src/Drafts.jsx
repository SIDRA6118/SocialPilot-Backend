/**
 * Drafts Component
 * Manages draft posts
 */

import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const DRAFTS_URL = `${API_BASE_URL}/api/drafts/`;
const REFRESH_URL = `${API_BASE_URL}/api/token/refresh/`;

export default function Drafts({ isAuthenticated, onRefresh }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    platform: "",
    content_type: "text",
    media_url: "",
  });

  const getHeaders = () => {
    const accessToken = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const requestWithAuth = async (url, options = {}) => {
    let response = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) },
    });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        const refreshResponse = await fetch(REFRESH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem("access_token", data.access);
          response = await fetch(url, {
            ...options,
            headers: { ...getHeaders(), ...(options.headers || {}) },
          });
        }
      }
    }

    return response;
  };

  const fetchDrafts = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await requestWithAuth(DRAFTS_URL);

      if (response.ok) {
        const data = await response.json();
        setDrafts(Array.isArray(data) ? data : data.results || []);
      } else {
        setMessage(`Failed to load drafts (${response.status})`);
      }
    } catch (error) {
      console.error("Fetch drafts error:", error);
      setMessage("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = window.setTimeout(fetchDrafts, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [isAuthenticated]);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      setMessage("Please enter content");
      return;
    }

    try {
      setLoading(true);
      const response = await requestWithAuth(DRAFTS_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newDraft = await response.json();
        setDrafts([newDraft, ...drafts]);
        setFormData({ title: "", content: "", platform: "", content_type: "text", media_url: "" });
        setShowForm(false);
        setMessage("Draft created successfully");
      } else {
        const error = await response.json().catch(() => ({}));
        const firstError = Object.values(error).flat()[0];
        setMessage(firstError || error.detail || `Failed to create draft (${response.status})`);
      }
    } catch (error) {
      console.error("Create draft error:", error);
      setMessage("Error creating draft");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId) => {
    if (!window.confirm("Delete this draft?")) return;

    try {
      setLoading(true);
      const response = await requestWithAuth(`${DRAFTS_URL}${draftId}/`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId));
        setMessage("Draft deleted");
      }
    } catch (error) {
      console.error("Delete draft error:", error);
      setMessage("Error deleting draft");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToPost = async (draft) => {
  const scheduledTime = window.prompt(
    "Enter schedule date and time (YYYY-MM-DDTHH:MM):",
    ""
  );

  if (!scheduledTime) return;

  const selectedDate = new Date(scheduledTime);

  if (Number.isNaN(selectedDate.getTime())) {
    setMessage("Please enter a valid date and time.");
    return;
  }

  if (selectedDate <= new Date()) {
    setMessage("Schedule time must be in the future.");
    return;
  }

  try {
    setLoading(true);

    const response = await requestWithAuth(
      `${DRAFTS_URL}${draft.id}/convert_to_post/`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          platform: draft.platform || "linkedin",
          scheduled_time: selectedDate.toISOString(),
        }),
      }
    );

    if (response.ok) {
      setDrafts((currentDrafts) =>
        currentDrafts.filter((item) => item.id !== draft.id)
      );

      setMessage("Draft converted to scheduled post successfully.");

      if (onRefresh) {
        onRefresh();
      }
    } else {
      const error = await response.json().catch(() => ({}));
      setMessage(
        error.error ||
          error.detail ||
          "Failed to convert draft"
      );
    }
  } catch (error) {
    console.error("Convert draft error:", error);
    setMessage("Error converting draft");
  } finally {
    setLoading(false);
  }
};

      
  return (
    <section className="drafts-section card">
      <div className="section-header">
        <h3>📝 Drafts</h3>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? "Cancel" : "+ New Draft"}
        </button>
      </div>

      {message && <div className={`message ${message.includes("Error") ? "error" : "success"}`}>{message}</div>}

      {showForm && (
        <form className="draft-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Draft Title (optional)"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input"
          />
          <textarea
            placeholder="What's on your mind?"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="form-textarea"
            rows="4"
            required
          />
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="form-select"
          >
            <option value="">Select Platform (optional)</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          <input
            type="url"
            placeholder="Media URL (optional)"
            value={formData.media_url}
            onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
            className="form-input"
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save Draft"}
          </button>
        </form>
      )}

      <div className="drafts-list">
        {loading && !showForm && <p>Loading drafts...</p>}
        {drafts.length === 0 && !showForm && (
          <p className="empty-message">No drafts yet. Create your first draft!</p>
        )}
        {drafts.map(draft => (
          <div key={draft.id} className="draft-card">
            <div className="draft-content">
              {draft.title && <h4>{draft.title}</h4>}
              <p>{draft.content.substring(0, 100)}...</p>
              {draft.platform && <span className="draft-platform">{draft.platform}</span>}
            </div>
            <div className="draft-actions">
              <button
  className="btn-small"
  onClick={() => handleConvertToPost(draft)}
  disabled={loading}
>
  Schedule
</button>
              <button
                className="btn-small btn-danger"
                onClick={() => handleDelete(draft.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
