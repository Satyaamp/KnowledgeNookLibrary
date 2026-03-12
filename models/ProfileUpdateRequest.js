const mongoose = require('mongoose');

const profileUpdateRequestSchema = new mongoose.Schema({
    StudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    LibraryID: {
        type: String,
    },
    SubmittedDate: {
        type: Date,
        default: Date.now,
    },
    ProposedData: {
        type: Object, // Stores key-value pairs of fields that student wants to update
        required: true,
    },
    Status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending',
    },
    AdminNote: {
        type: String, // For rejection reason or other comments
    },
    SeenByStudent: {
        type: Boolean,
        default: false,
    },
    HiddenByStudent: {
        type: Boolean,
        default: false
    },
    Flag: {
        type: String,
        default: 'A'
    }
}, { timestamps: true });

module.exports = mongoose.model('ProfileUpdateRequest', profileUpdateRequestSchema);
