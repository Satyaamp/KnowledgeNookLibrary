const express = require('express');
const router = express.Router();
const { addStudent, getStudents, updateStudent, getProfileRequests, approveProfileRequest, rejectProfileRequest, getDashboardStats, getInterestedStudents, markInterestedStudentReviewed, rejectInterestedStudent, convertInterestedStudent } = require('../controllers/adminController');
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');

// Protect all admin routes
router.use(authGuard, adminGuard);

router.route('/dashboard-stats')
    .get(getDashboardStats);

router.route('/students')
    .post(addStudent)
    .get(getStudents);

router.route('/students/:id')
    .put(updateStudent);

router.route('/profile-requests')
    .get(getProfileRequests);

router.route('/profile-requests/:id/approve')
    .put(approveProfileRequest);

router.route('/profile-requests/:id/reject')
    .put(rejectProfileRequest);

router.route('/interested-students')
    .get(getInterestedStudents);

router.route('/interested-students/:id/review')
    .put(markInterestedStudentReviewed);

router.route('/interested-students/:id/reject')
    .put(rejectInterestedStudent);

router.route('/convert-student/:id')
    .post(convertInterestedStudent);

module.exports = router;
