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
        type: String,
        required: true, // Cloudinary URL
    }
}, { timestamps: true });

module.exports = mongoose.model('Fee', feeSchema);
