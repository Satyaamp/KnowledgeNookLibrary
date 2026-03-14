const mongoose = require('mongoose');

const deletedIssueSchema = new mongoose.Schema({
    StudentName: {
        type: String,
        required: true,
    },
    StudentContact: {
        type: String,
        required: true,
    },
    LibraryID: {
        type: String, // Optional string just for archiving
    },
    IssueTitle: {
        type: String,
        required: true,
    },
    Message: {
        type: String,
        required: true,
    },
    Status: {
        type: String,
        required: true,
    },
    AdminResponse: {
        type: String
    },
    OriginalCreatedAt: {
        type: Date,
        required: true,
    },
    DeletedByRole: {
        type: String,
        enum: ['student', 'admin'],
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('DeletedIssue', deletedIssueSchema);
