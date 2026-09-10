/**
 * QueueStatus Component
 * Displays publishing queue status and pending posts
 */

import { useEffect, useState } from "react";

const QUEUE_URL = "http://127.0.0.1:8000/api/queue/";

export default function QueueStatus({ isAuthenticated, refreshTrigger }) {
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    total: 0,
  });
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const getHeaders = () => {
    const accessToken = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const fetchQueueStatus = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${QUEUE_URL.replace(/\/$/, '')}/pending/`,
        { headers: getHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingPosts(Array.isArray(data) ? data : data.posts || []);
      }

      // Also fetch overall status
      const statusUrl = QUEUE_URL.replace(/\/$/, '');
      const statusResponse = await fetch(statusUrl, {
        headers: getHeaders(),
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setQueueStatus({
          pending: statusData.pending || 0,
          processing: statusData.processing || 0,
          completed: statusData.completed || 0,
          total: statusData.total || 0,
        });
      }
    } catch (error) {
      console.error("Fetch queue status error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = window.setTimeout(fetchQueueStatus, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [isAuthenticated, refreshTrigger]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchQueueStatus();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated]);

  return (
    <section className="queue-status card">
      <div className="section-header">
        <h3>📤 Publishing Queue</h3>
        <div className="queue-controls">
          <label className="toggle-auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            className="btn-small"
            onClick={fetchQueueStatus}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="queue-stats">
        <div className="stat-card">
          <div className="stat-number pending">{queueStatus.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number processing">{queueStatus.processing}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-number completed">{queueStatus.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number total">{queueStatus.total}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div className="pending-posts">
        <h4>Ready to Publish ({pendingPosts.length})</h4>
        {pendingPosts.length === 0 ? (
          <p className="empty-message">No posts ready to publish</p>
        ) : (
          <div className="posts-list">
            {pendingPosts.map((post, index) => (
              <div key={post.id || index} className="queue-post-item">
                <div className="post-platform">{post.platform}</div>
                <div className="post-content">{post.content?.substring(0, 60)}...</div>
                <div className="post-scheduled">
                  Scheduled: {new Date(post.scheduled_for).toLocaleString()}
                </div>
                <div className="post-attempts">Attempts: {post.attempts}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="queue-info">
        <small>
          Posts are automatically published when their scheduled time is reached.
          Check back soon for updates!
        </small>
      </div>
    </section>
  );
}
