const express = require('express');
const router = express.Router();
const { getProfile, requestProfileUpdate, submitInterested, changePassword } = require('../controllers/studentController');
const { authGuard } = require('../middleware/authGuard');

// Public route for interested students
router.post('/interested', submitInterested);

// Protect all other routes with authGuard (ensures req.user is set)
router.use(authGuard);

router.get('/profile', getProfile);
router.post('/profile-update', requestProfileUpdate);
router.put('/change-password', changePassword);

module.exports = router;
