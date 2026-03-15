const express = require('express');
const router = express.Router();
const { getProfile, requestProfileUpdate, submitInterested, changePassword, getMyProfileRequest, markRequestAsSeen, getAllMyProfileRequests, deleteProfileRequest, deleteManyProfileRequests, updateProfilePicture, updateAadhar, getVapidPublicKey, savePushSubscription, getMyNotifications, markNotificationsAsRead, deleteNotification } = require('../controllers/studentController');
const { authGuard } = require('../middleware/authGuard');
const upload = require('../utils/upload');

// Public route for interested students
router.post('/interested', submitInterested);

// Protect all other routes with authGuard (ensures req.user is set)
router.use(authGuard);

router.get('/profile', getProfile);
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', savePushSubscription);
router.get('/notifications', getMyNotifications);
router.put('/notifications/read', markNotificationsAsRead);
router.delete('/notifications/:id', deleteNotification);
router.post('/profile-update', requestProfileUpdate);
router.get('/profile-update-request', getMyProfileRequest);
router.post('/update-profile-pic', upload.single('profilePic'), updateProfilePicture);
router.post('/update-aadhar', upload.single('aadharProof'), updateAadhar);
router.put('/profile-update-request/:id/seen', markRequestAsSeen);
router.get('/profile-requests', getAllMyProfileRequests);
router.delete('/profile-requests', deleteManyProfileRequests);
router.delete('/profile-requests/:id', deleteProfileRequest);
router.put('/change-password', changePassword);

module.exports = router;
