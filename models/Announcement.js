const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    Title: {
        type: String,
        required: true,
    },
    Message: {
        type: String,
        required: true,
    },
    ImageURL: {
        type: String, // Optional field to store Cloudinary URL
    },
    CreatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Administrator',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
