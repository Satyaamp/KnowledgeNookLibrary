const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    StudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    LibraryID: { type: String },
    StudentName: { type: String },
    Title: { type: String, required: true },
    Message: { type: String, required: true },
    Url: { type: String },
    IsRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);