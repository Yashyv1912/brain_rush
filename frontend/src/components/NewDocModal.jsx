import React, { useState } from "react";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript / Node.js" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python 3" },
  { id: "cpp", name: "C / C++" },
  { id: "html", name: "HTML5" },
  { id: "css", name: "CSS3" },
  { id: "json", name: "JSON Configuration" },
  { id: "markdown", name: "Markdown" },
];

export default function NewDocModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onCreate(title.trim(), language);
    setLoading(false);
    setTitle("");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>📄 Create New Code File</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>File Title</label>
            <input
              type="text"
              placeholder="e.g. main.js, app.py, index.html"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Programming Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim()}
            >
              {loading ? "Creating..." : "Create & Open File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
