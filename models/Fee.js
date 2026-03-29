const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    StudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    LibraryID: {
        type: String, // Stored locally on the document
    },
    Month: {
        type: String, // e.g., "October 2026"
        required: true,
    },
    Batch: {
        type: String, // Stored as a snapshot, e.g., "Standard"
        required: false,
    },
    Amount: {
        type: Number,
        required: true,
    },
    Status: {
        type: String,
        enum: ['Pending', 'Paid', 'Rejected'],
        default: 'Pending',
    },
    AdminNote: {
        type: String, // Reason for rejection or other notes
    },
    ProofImageURL: {
        type: String
    },
    isResubmitted: {
        type: Boolean,
        default: false
    },
    ReceiptNo: {
        type: String,
        unique: true,
        sparse: true
    },
    downloadHistory: [{
        downloadedAt: { type: Date, default: Date.now },
        downloadedByRole: { type: String } // e.g., 'student' or 'admin'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
