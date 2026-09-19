import React, { useState } from "react";
import { documentAPI } from "../services/api";

export default function ShareModal({ doc, isOpen, onClose, onShareSuccess }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen || !doc) return null;

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus({ type: "", message: "" });
    setLoading(true);

    try {
      const res = await documentAPI.share(doc._id, email.trim());
      setStatus({ type: "success", message: res.message });
      setEmail("");
      if (onShareSuccess) onShareSuccess(res.document);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>👥 Share "{doc.title}"</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="share-info">
          <p>
            Invite teammates to collaborate in real-time. Shared users will get instant edit access to this document.
          </p>
        </div>

        {status.message && (
          <div className={`status-banner ${status.type}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleShare} className="modal-form">
          <div className="form-group">
            <label>Collaborator's Email</label>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Done
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sharing..." : "Invite Collaborator"}
            </button>
          </div>
        </form>

        <div className="collaborator-list">
          <h4>Active Collaborators ({doc.collaborators?.length || 0})</h4>
          {doc.collaborators && doc.collaborators.length > 0 ? (
            <ul>
              {doc.collaborators.map((c) => (
                <li key={c._id || c}>
                  <span className="user-avatar-sm">
                    {c.name ? c.name[0].toUpperCase() : "U"}
                  </span>
                  <div className="user-details">
                    <span className="user-name">{c.name || "Collaborator"}</span>
                    <span className="user-email">{c.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-subtext">No collaborators invited yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
