const Announcement = require('../models/Announcement');
const DeletedAnnouncement = require('../models/DeletedAnnouncement');
const cloudinary = require('../config/cloudinary');
const { broadcastPush } = require('../utils/pushHelper');

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res) => {
    try {
        const { Title, Message } = req.body;
        let ImageURL = null;

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, { folder: 'announcements' });
            ImageURL = result.secure_url;
        }

        const announcement = await Announcement.create({
            Title,
            Message,
            ImageURL,
            CreatedBy: req.user.id
        });

        // Broadcast push to all students
        await broadcastPush({
            title: 'New Announcement',
            message: Title,
            url: '/student/dashboard.html#home'
        });

        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private (Student & Admin)
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({}).sort({ createdAt: -1 }).populate('CreatedBy', 'Name');
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching announcements', error: error.message });
    }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Archive the announcement
        await DeletedAnnouncement.create({
            Title: announcement.Title,
            Message: announcement.Message,
            DeletedBy: req.user.id,
            AnnouncementDate: announcement.createdAt
        });

        await Announcement.deleteOne({ _id: announcement._id });
        res.json({ message: 'Announcement removed and archived' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting announcement', error: error.message });
    }
};

module.exports = { createAnnouncement, getAnnouncements, deleteAnnouncement };
