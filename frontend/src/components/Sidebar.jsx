import React from "react";

const LANG_ICONS = {
  javascript: "⚡",
  typescript: "📘",
  python: "🐍",
  cpp: "⚙️",
  html: "🌐",
  css: "🎨",
  json: "📋",
  markdown: "📝",
};

export default function Sidebar({
  user,
  documents,
  activeDocId,
  onSelectDoc,
  onOpenNewModal,
  onOpenShareModal,
  onDeleteDoc,
  onLogout,
}) {
  const myDocs = documents.filter(
    (d) => (d.owner._id || d.owner) === user?.id || (d.owner._id || d.owner) === user?._id
  );
  const sharedDocs = documents.filter(
    (d) => (d.owner._id || d.owner) !== user?.id && (d.owner._id || d.owner) !== user?._id
  );

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-logo">⚡</span>
          <span className="brand-title">CodeCraft</span>
        </div>
        <button
          className="btn-icon new-file-btn"
          onClick={onOpenNewModal}
          title="Create New File"
        >
          ➕ New
        </button>
      </div>

      {/* User Profile Bar */}
      <div className="user-profile-bar">
        <div className="user-info">
          <div className="user-avatar">{user?.name ? user.name[0].toUpperCase() : "U"}</div>
          <div className="user-text">
            <span className="user-display-name">{user?.name || "User"}</span>
            <span className="user-email-sub">{user?.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign Out">
          🚪
        </button>
      </div>

      {/* File Explorer Sections */}
      <div className="file-explorer">
        {/* My Documents */}
        <div className="explorer-section">
          <div className="section-title">
            <span>MY DOCUMENTS ({myDocs.length})</span>
          </div>

          {myDocs.length === 0 ? (
            <div className="empty-files-msg">No files yet. Click + New to create.</div>
          ) : (
            <ul className="file-list">
              {myDocs.map((doc) => {
                const isActive = doc._id === activeDocId;
                const icon = LANG_ICONS[doc.language] || "📄";

                return (
                  <li
                    key={doc._id}
                    className={`file-item ${isActive ? "active" : ""}`}
                    onClick={() => onSelectDoc(doc._id)}
                  >
                    <span className="file-icon">{icon}</span>
                    <span className="file-name" title={doc.title}>
                      {doc.title}
                    </span>

                    <div className="file-actions">
                      <button
                        className="action-icon"
                        title="Share File"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShareModal(doc);
                        }}
                      >
                        👥
                      </button>
                      <button
                        className="action-icon delete-icon"
                        title="Delete File"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDoc(doc._id, doc.title);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Shared With Me */}
        <div className="explorer-section">
          <div className="section-title">
            <span>SHARED WITH ME ({sharedDocs.length})</span>
          </div>
          {sharedDocs.length === 0 ? (
            <div className="empty-files-msg">No shared files yet.</div>
          ) : (
            <ul className="file-list">
              {sharedDocs.map((doc) => {
                const isActive = doc._id === activeDocId;
                const icon = LANG_ICONS[doc.language] || "📄";

                return (
                  <li
                    key={doc._id}
                    className={`file-item shared ${isActive ? "active" : ""}`}
                    onClick={() => onSelectDoc(doc._id)}
                  >
                    <span className="file-icon">{icon}</span>
                    <div className="file-details-col">
                      <span className="file-name" title={doc.title}>
                        {doc.title}
                      </span>
                      <span className="owner-badge">
                        by {doc.owner?.name || "Collaborator"}
                      </span>
                    </div>

                    <div className="file-actions">
                      <button
                        className="action-icon"
                        title="View Collaborators"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShareModal(doc);
                        }}
                      >
                        👥
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
