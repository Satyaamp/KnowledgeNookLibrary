const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');
const upload = require('../utils/upload');

// Protect all routes with authGuard
router.use(authGuard);

router.route('/')
    .get(getAnnouncements) // Both admin and student can get
    .post(adminGuard, upload.single('image'), createAnnouncement); // Only admin can create

router.route('/:id')
    .delete(adminGuard, deleteAnnouncement);

module.exports = router;
