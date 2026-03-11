const express = require('express');
const router = express.Router();
const { login, registerAdmin, registerStudent } = require('../controllers/authController');
const upload = require('../utils/upload');

router.post('/login', login);
router.post('/register-student', upload.fields([
    { name: 'ProfilePicture', maxCount: 1 },
    { name: 'AadharProof', maxCount: 1 }
]), registerStudent);
router.post('/register-admin', registerAdmin); // Ideally this should be protected or removed in prod after setup

module.exports = router;
