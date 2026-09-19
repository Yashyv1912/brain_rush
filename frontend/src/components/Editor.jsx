import React, { useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
];

const USER_COLORS = [
  "#ff2a5f",
  "#8b5cf6",
  "#06b6d4",
  "#ffb703",
  "#ec4899",
  "#10b981",
  "#3b82f6",
  "#f97316",
];

export default function Editor({
  doc,
  user,
  onLanguageChange,
  onOpenShareModal,
}) {
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const ydocRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!doc || !doc._id) return;

    setConnectionStatus("connecting");
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const documentId = doc._id;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.port === "5173" ? "localhost:3000" : window.location.host;
    const wsUrl = `${wsProtocol}//${host}?documentId=${documentId}`;

    let isDestroyed = false;
    let socket;

    function connectWebSocket() {
      if (isDestroyed) return;
      socket = new WebSocket(wsUrl);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      const userColor = USER_COLORS[Math.abs((user?.name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % USER_COLORS.length];

      socket.onopen = () => {
        if (isDestroyed) return;
        setConnectionStatus("connected");

        // Send presence user info to room
        if (user) {
          socket.send(
            JSON.stringify({
              type: "presence",
              user: {
                id: user.id || user._id,
                name: user.name,
                email: user.email,
                color: userColor,
              },
            })
          );
        }
      };

      socket.onmessage = (event) => {
        if (isDestroyed) return;
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "presence_list") {
              setOnlineUsers(data.users || []);
              return;
            }
          } catch (e) {}
        }

        try {
          const update = new Uint8Array(event.data);
          Y.applyUpdate(ydoc, update, "remote");
        } catch (err) {}
      };

      socket.onclose = () => {
        if (isDestroyed) return;
        setConnectionStatus("disconnected");
        setOnlineUsers([]);
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = () => {
        if (isDestroyed) return;
        setConnectionStatus("error");
      };
    }

    const handleUpdate = (update, origin) => {
      if (origin === "remote") return;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(update);
      }
    };

    ydoc.on("update", handleUpdate);
    connectWebSocket();

    return () => {
      isDestroyed = true;
      ydoc.off("update", handleUpdate);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (socket) {
        socket.close();
      }
      ydoc.destroy();
    };
  }, [doc?._id, user?.id]);

  const handleBeforeMount = (monaco) => {
    monaco.editor.defineTheme("brainrush-cyber", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "ff2a5f", fontStyle: "bold" },
        { token: "string", foreground: "38bdf8" },
        { token: "number", foreground: "ffb703" },
        { token: "type", foreground: "a855f7" },
        { token: "function", foreground: "a855f7" },
        { token: "identifier", foreground: "f8fafc" },
        { token: "delimiter", foreground: "94a3b8" },
      ],
      colors: {
        "editor.background": "#0c0d14",
        "editor.foreground": "#f8fafc",
        "editorCursor.foreground": "#ff2a5f",
        "editor.lineHighlightBackground": "#161824",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#ff2a5f",
        "editor.selectionBackground": "#ff2a5f40",
        "editor.inactiveSelectionBackground": "#ff2a5f20",
      },
    });
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    if (ydocRef.current) {
      const ytext = ydocRef.current.getText("monaco");
      const model = editor.getModel();

      if (bindingRef.current) {
        bindingRef.current.destroy();
      }

      bindingRef.current = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        null
      );
    }
  };

  if (!doc) {
    return (
      <div className="empty-editor-state">
        <div className="empty-content">
          <span className="empty-icon">📁</span>
          <h2>No File Selected</h2>
          <p>Select a code file from the sidebar or create a new one to begin editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Top Action Bar */}
      <div className="editor-topbar">
        <div className="doc-title-info">
          <span className="doc-icon">📄</span>
          <span className="doc-title">{doc.title}</span>
          <span className="owner-tag">
            {doc.owner?.name ? `Owner: ${doc.owner.name}` : "My Document"}
          </span>
        </div>

        <div className="topbar-actions">
          {/* Active Online Collaborators Avatars */}
          {onlineUsers.length > 0 && (
            <div className="collaborator-avatars" title="Active users in this file">
              <span className="active-user-count">{onlineUsers.length} Online:</span>
              {onlineUsers.map((u, i) => (
                <div
                  key={u.id || u.email || i}
                  className="collaborator-pill"
                  style={{ backgroundColor: u.color || USER_COLORS[i % USER_COLORS.length] }}
                  title={`${u.name || "Collaborator"} (${u.email}) is currently editing`}
                >
                  <span className="online-dot"></span>
                  <span className="pill-initial">{u.name ? u.name[0].toUpperCase() : "U"}</span>
                  <span className="pill-name">{u.name ? u.name.split(" ")[0] : "User"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Language Selector */}
          <select
            className="language-select"
            value={doc.language || "javascript"}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Share Button */}
          <button
            className="btn btn-share"
            onClick={() => onOpenShareModal(doc)}
          >
            👥 Share File
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="monaco-wrapper">
        <MonacoEditor
          height="100%"
          language={doc.language || "javascript"}
          theme="brainrush-cyber"
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            minimap: { enabled: true },
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
          }}
        />
      </div>

      {/* Bottom Status Bar */}
      <div className="editor-statusbar">
        <div className="status-left">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span className="status-text">
            {connectionStatus === "connected"
              ? "Live Synchronized"
              : connectionStatus === "connecting"
              ? "Connecting..."
              : "Offline / Reconnecting"}
          </span>
        </div>

        <div className="status-right">
          <span className="stat-item">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="stat-item uppercase">{doc.language || "javascript"}</span>
          <span className="stat-item">UTF-8</span>
        </div>
      </div>
    </div>
  );
}
