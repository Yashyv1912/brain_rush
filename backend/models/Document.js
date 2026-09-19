const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled Document",
      trim: true,
    },
    language: {
      type: String,
      default: "javascript",
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // The binary field where the Yjs document state is saved
    yjsState: {
      type: Buffer,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
