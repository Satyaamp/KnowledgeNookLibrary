const express = require('express');
const router = express.Router();
const { createIssue, getMyIssues, getAllIssues, updateIssueStatus, deleteIssue } = require('../controllers/issueController');
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');

// Protect all routes with authGuard
router.use(authGuard);

// Student routes
router.post('/create', createIssue);
router.get('/my', getMyIssues);

// Admin routes
router.route('/')
    .get(adminGuard, getAllIssues);

router.route('/:id')
    .put(adminGuard, updateIssueStatus)
    .delete(deleteIssue);

module.exports = router;
