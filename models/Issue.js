const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    StudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    LibraryID: {
        type: String, // Stored locally on the document
    },
    IssueTitle: {
        type: String,
        required: true,
    },
    Description: {
        type: String,
        required: true,
    },
    Status: {
        type: String,
        enum: ['Pending', 'Seen by Admin', 'In Progress', 'Resolved'],
        default: 'Pending',
    },
    AdminResponse: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
