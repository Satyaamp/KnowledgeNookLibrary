const mongoose = require('mongoose');

const deletedAnnouncementSchema = new mongoose.Schema({
    Title: {
        type: String,
        required: true,
    },
    Message: {
        type: String,
        required: true,
    },
    DeletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Administrator',
        required: true,
    },
    AnnouncementDate: {
        type: Date,
        required: true,
    }
}, { timestamps: true }); // timestamps adds createdAt (DeletedDate) and updatedAt

module.exports = mongoose.model('DeletedAnnouncement', deletedAnnouncementSchema);
