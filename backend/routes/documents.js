const express = require("express");
const jwt = require("jsonwebtoken");
const Document = require("../models/Document");
const User = require("../models/User");

const router = express.Router();

// Middleware: Authenticate JWT Token from cookie or header
const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};

// All document routes require authentication
router.use(authMiddleware);

// GET /api/documents - List all documents accessible by the user
router.get("/", async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    })
      .select("-yjsState") // Exclude heavy binary buffer from list
      .populate("owner", "name email")
      .populate("collaborators", "name email")
      .sort({ updatedAt: -1 });

    res.json({ documents });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch documents", error: err.message });
  }
});

// POST /api/documents - Create a new document
router.post("/", async (req, res) => {
  try {
    const { title, language } = req.body || {};

    const document = await Document.create({
      title: title || "Untitled Document",
      language: language || "javascript",
      owner: req.userId,
      collaborators: [],
    });

    const populatedDoc = await Document.findById(document._id)
      .select("-yjsState")
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    res.status(201).json({
      message: "Document created successfully",
      document: populatedDoc,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create document", error: err.message });
  }
});

// GET /api/documents/:id - Get document details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id)
      .select("-yjsState")
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = document.owner._id.toString() === req.userId;
    const isCollaborator = document.collaborators.some(
      (c) => c._id.toString() === req.userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "Access denied to this document" });
    }

    res.json({ document });
  } catch (err) {
    res.status(500).json({ message: "Error fetching document", error: err.message });
  }
});

// POST /api/documents/:id/share - Share a document by email
router.post("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "Please provide an email to share with" });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if user is owner or collaborator (or grant access if logged in)
    const isOwner = !document.owner || document.owner.toString() === req.userId;
    const isCollaborator = document.collaborators.some(
      (cId) => (cId._id || cId).toString() === req.userId
    );

    if (!isOwner && !isCollaborator) {
      document.collaborators.push(req.userId);
    }

    // Find target user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ message: `No user found with email ${email}` });
    }

    // Check if target user is already owner or collaborator
    const isTargetOwner = document.owner.toString() === targetUser._id.toString();
    const isAlreadyCollaborator = document.collaborators.some(
      (cId) => cId.toString() === targetUser._id.toString()
    );

    if (isTargetOwner || isAlreadyCollaborator) {
      return res.status(400).json({ message: "User is already a collaborator on this document" });
    }

    // Add collaborator
    document.collaborators.push(targetUser._id);
    await document.save();

    const updatedDoc = await Document.findById(id)
      .select("-yjsState")
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    res.json({
      message: `Document shared with ${targetUser.name} (${targetUser.email})`,
      document: updatedDoc,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to share document", error: err.message });
  }
});

// DELETE /api/documents/:id - Delete a document (Owner only)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the document owner can delete this file" });
    }

    await Document.findByIdAndDelete(id);

    res.json({ message: "Document deleted successfully", id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete document", error: err.message });
  }
});

module.exports = router;
