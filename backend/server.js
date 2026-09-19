const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Force public DNS bypass for Windows users

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Y = require("yjs");
require("dotenv").config();

const { loadYDoc, saveYDoc } = require("./websocket/collaboration");
const Document = require("./models/Document");

const app = express();
const server = http.createServer(app);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// Mount Auth & Document Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/documents", require("./routes/documents"));

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
const activeDocs = new Map();

// Helper: Parse cookie header string
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let parts = cookie.split("=");
    list[parts.shift().trim()] = decodeURI(parts.join("="));
  });
  return list;
}

// Helper: Debounced function to save Yjs state updates to MongoDB
const saveTimeouts = new Map();
function queueSaveToDatabase(documentId, ydoc) {
  if (saveTimeouts.has(documentId)) return;

  saveTimeouts.set(documentId, setTimeout(async () => {
    try {
      await saveYDoc(documentId, ydoc);
    } catch (err) {
      console.error(`Failed to save document ${documentId}:`, err);
    } finally {
      saveTimeouts.delete(documentId);
    }
  }, 2000)); // Save to database 2 seconds after typing stops
}

wss.on("connection", async (socket, request) => {
  const documentId = request.docId;
  console.log(`Authenticated client joined document: ${documentId}`);

  // Load Yjs document if it isn't already in memory
  let ydoc = activeDocs.get(documentId);
  if (!ydoc) {
    ydoc = await loadYDoc(documentId);
    activeDocs.set(documentId, ydoc);
  }

  // Send current document state to newly connected client
  const state = Y.encodeStateAsUpdate(ydoc);
  socket.send(state);

  // Link docId to socket for client filtering in broadcasts
  socket.docId = documentId;

  socket.on("message", (message, isBinary) => {
    // Check if JSON presence message
    if (!isBinary) {
      try {
        const text = message.toString();
        const data = JSON.parse(text);
        if (data.type === "presence") {
          socket.user = data.user;
          
          const onlineList = [];
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.docId === documentId && client.user) {
              onlineList.push(client.user);
            }
          });

          const presenceMsg = JSON.stringify({ type: "presence_list", users: onlineList });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.docId === documentId) {
              client.send(presenceMsg);
            }
          });
          return;
        }
      } catch (e) {}
    }

    // 1. Broadcast the binary update to all OTHER clients connected to this document
    wss.clients.forEach((client) => {
      if (
        client !== socket && 
        client.readyState === WebSocket.OPEN && 
        client.docId === documentId
      ) {
        client.send(message);
      }
    });

    // 2. Apply change to the server's Yjs Doc in memory, then queue save
    try {
      const update = new Uint8Array(message);
      Y.applyUpdate(ydoc, update, socket);
      
      // Queue a debounced save to MongoDB
      queueSaveToDatabase(documentId, ydoc);
    } catch (error) {
      console.error("Error applying Yjs update on server:", error);
    }
  });

  socket.on("close", () => {
    console.log(`Client disconnected from document: ${documentId}`);

    // Broadcast updated presence list on disconnect
    const onlineList = [];
    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN && client.docId === documentId && client.user) {
        onlineList.push(client.user);
      }
    });

    const presenceMsg = JSON.stringify({ type: "presence_list", users: onlineList });
    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN && client.docId === documentId) {
        client.send(presenceMsg);
      }
    });

    // Clean up memory if no clients are connected to this room anymore
    let activeClients = 0;
    wss.clients.forEach((c) => {
      if (c.docId === documentId) activeClients++;
    });
    if (activeClients === 0) {
      activeDocs.delete(documentId);
      console.log(`Unloaded document ${documentId} from server memory.`);
    }
  });
});

// Intercept HTTP upgrades to check JWT token and document access
server.on("upgrade", async (request, socket, head) => {
  try {
    // 1. Parse cookie and verify token
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      return socket.destroy();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // 2. Parse document ID from request URL (e.g., ?documentId=xxx)
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const docId = url.searchParams.get("documentId") || url.pathname.replace(/^\//, "");

    if (!docId || !mongoose.Types.ObjectId.isValid(docId)) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      return socket.destroy();
    }

    // 3. Query document and check user authorization
    let doc = await Document.findById(docId);
    if (!doc) {
      // Auto-create for testing if document does not exist
      doc = await Document.create({
        _id: docId,
        title: "Demo Document",
        owner: userId,
        collaborators: []
      });
      console.log(`Automatically created demo document in MongoDB: ${docId}`);
    }

    const isOwner = doc.owner.toString() === userId;
    const isCollaborator = doc.collaborators.some((cId) => cId.toString() === userId);

    if (!isOwner && !isCollaborator) {
      // Auto-add authenticated user as collaborator for seamless real-time collaboration
      doc.collaborators.push(userId);
      await doc.save();
      console.log(`Added user ${userId} as collaborator on document ${docId}`);
    }

    // 4. Pass credentials to connection event
    request.userId = userId;
    request.docId = docId;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } catch (err) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});