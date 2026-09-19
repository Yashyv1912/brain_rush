import React, { useEffect, useState } from "react";
import AuthModal from "./components/AuthModal";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import NewDocModal from "./components/NewDocModal";
import ShareModal from "./components/ShareModal";
import { authAPI, documentAPI } from "./services/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [shareDocTarget, setShareDocTarget] = useState(null);

  // Check auth session on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await authAPI.getMe();
        setUser(data.user);
        await loadDocuments();
      } catch (err) {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await documentAPI.getAll();
      const docs = res.documents || [];
      setDocuments(docs);

      // If activeDocId is not selected or no longer exists, select first doc
      if (docs.length > 0 && (!activeDocId || !docs.some((d) => d._id === activeDocId))) {
        setActiveDocId(docs[0]._id);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleLoginSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    await loadDocuments();
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {}
    setUser(null);
    setDocuments([]);
    setActiveDocId(null);
  };

  const handleCreateDocument = async (title, language) => {
    try {
      const res = await documentAPI.create(title, language);
      const newDoc = res.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc._id);
    } catch (err) {
      alert(err.message || "Failed to create file");
    }
  };

  const handleLanguageChange = (newLanguage) => {
    if (!activeDocId) return;
    setDocuments((prev) =>
      prev.map((d) => (d._id === activeDocId ? { ...d, language: newLanguage } : d))
    );
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await documentAPI.delete(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      if (activeDocId === docId) {
        const remaining = documents.filter((d) => d._id !== docId);
        setActiveDocId(remaining.length > 0 ? remaining[0]._id : null);
      }
    } catch (err) {
      alert(err.message || "Failed to delete document");
    }
  };

  const handleShareSuccess = (updatedDoc) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
    );
  };

  const activeDoc = documents.find((d) => d._id === activeDocId) || null;

  if (!authChecked) {
    return (
      <div className="empty-editor-state" style={{ height: "100vh" }}>
        <div className="empty-content">
          <span className="spinner" style={{ width: 32, height: 32, margin: "0 auto 1rem" }}></span>
          <p>Loading CodeCraft workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar Explorer */}
      <Sidebar
        user={user}
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={(id) => setActiveDocId(id)}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenShareModal={(doc) => setShareDocTarget(doc)}
        onDeleteDoc={handleDeleteDocument}
        onLogout={handleLogout}
      />

      {/* Main Monaco Code Editor Area */}
      <main className="main-content">
        <Editor
          doc={activeDoc}
          user={user}
          onLanguageChange={handleLanguageChange}
          onOpenShareModal={(doc) => setShareDocTarget(doc)}
        />
      </main>

      {/* Modals */}
      <NewDocModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateDocument}
      />

      <ShareModal
        doc={shareDocTarget}
        isOpen={!!shareDocTarget}
        onClose={() => setShareDocTarget(null)}
        onShareSuccess={handleShareSuccess}
      />
    </div>
  );
}
