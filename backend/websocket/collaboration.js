const Y = require("yjs");
const Document = require("../models/Document");

// Load the document state from MongoDB and apply it to a Yjs document
async function loadYDoc(documentId) {
    const ydoc = new Y.Doc();
    ydoc.gc = false;

    try {
        const document = await Document.findById(documentId);

        if (document && document.yjsState) {
            try {
                const state = new Uint8Array(document.yjsState);
                Y.applyUpdate(ydoc, state);
                const ytext = ydoc.getText("code");
                if (ytext.toString().length > 10000) {
                    console.log(`Resetting oversized test document ${documentId}`);
                    await Document.findByIdAndUpdate(documentId, { yjsState: Buffer.from([]) });
                    return new Y.Doc();
                }
                console.log(`Loaded document ${documentId} from MongoDB`);
            } catch (e) {
                console.error(`Failed to apply Yjs state for ${documentId}, starting clean:`, e);
                await Document.findByIdAndUpdate(documentId, { yjsState: Buffer.from([]) });
            }
        } else {
            console.log(`Creating new Yjs document: ${documentId}`);
        }
    } catch (err) {
        console.error(`Error loading document ${documentId}:`, err);
    }

    return ydoc;
}

// Encode the Yjs document state as a binary update and save it to MongoDB
async function saveYDoc(documentId, ydoc) {
    try {
        const state = Y.encodeStateAsUpdate(ydoc);

        await Document.findByIdAndUpdate(
            documentId,
            {
                yjsState: Buffer.from(state),
                updatedAt: new Date()
            },
            { new: true }
        );

        console.log(`Saved document ${documentId} to MongoDB`);
    } catch (err) {
        console.error(`Error saving document ${documentId} to MongoDB:`, err);
    }
}

module.exports = {
    loadYDoc,
    saveYDoc
};
