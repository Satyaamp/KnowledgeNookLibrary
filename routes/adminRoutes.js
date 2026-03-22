const express = require('express');
const router = express.Router();
const { addStudent, getStudents, updateStudent, getProfileRequests, approveProfileRequest, rejectProfileRequest, getDashboardStats, getInterestedStudents, markInterestedStudentReviewed, rejectInterestedStudent, convertInterestedStudent, updateProfileRequestStatus, verifyAadhar, notifyNotUploadedAadhar, bulkUploadStudents, sendManualNotification, getStudentNotifications, getDailyAttendance, manualCheckIn, manualCheckOut, getSeatConfig, updateSeatConfig } = require('../controllers/adminController');
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');
const upload = require('../utils/upload');


// Protect all admin routes
router.use(authGuard, adminGuard);

router.route('/dashboard-stats')
    .get(getDashboardStats);

router.route('/students')
    .post(addStudent)
    .get(getStudents);

router.route('/students/bulk-upload')
    .post(bulkUploadStudents);


router.route('/students/:id')
    .put(updateStudent);

router.route('/students/:id/verify-aadhar')
    .put(verifyAadhar);

router.route('/aadhar/notify-not-uploaded')
    .post(notifyNotUploadedAadhar);

router.route('/students/:id/notify')
    .post(sendManualNotification);

router.route('/students/:id/notifications')
    .get(getStudentNotifications);

router.route('/profile-requests')
    .get(getProfileRequests);

router.route('/profile-requests/:id/approve')
    .put(approveProfileRequest);

router.route('/profile-requests/:id/reject')
    .put(rejectProfileRequest);

router.route('/profile-requests/:id/status')
    .put(updateProfileRequestStatus);

router.route('/interested-students')
    .get(getInterestedStudents);

router.route('/interested-students/:id/review')
    .put(markInterestedStudentReviewed);

router.route('/interested-students/:id/reject')
    .put(rejectInterestedStudent);

router.route('/convert-student/:id')
    .post(convertInterestedStudent);

router.get('/attendance', getDailyAttendance);
router.post('/attendance', manualCheckIn);
router.put('/attendance/:id/checkout', manualCheckOut);

router.route('/config/seats')
    .get(getSeatConfig)
    .put(updateSeatConfig);

module.exports = router;
