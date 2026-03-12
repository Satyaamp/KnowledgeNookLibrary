const Student = require('../models/Student');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const InterestedStudent = require('../models/InterestedStudent');
const bcrypt = require('bcryptjs');

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private/Student
const getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select('-Password');
        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Submit profile update request
// @route   POST /api/students/profile-update
// @access  Private/Student
const requestProfileUpdate = async (req, res) => {
    try {
        const existingRequest = await ProfileUpdateRequest.findOne({
            StudentId: req.user.id,
            Status: 'Pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'A pending request already exists. Please wait for admin approval.' });
        }

        const request = await ProfileUpdateRequest.create({
            StudentId: req.user.id,
            ProposedData: req.body,
        });

        res.status(201).json({
            message: 'Your modified data is under review. Current data is still active.',
            request
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error processing request', error: error.message });
    }
};

// @desc    Submit interest form
// @route   POST /api/students/interested
// @access  Public
const submitInterested = async (req, res) => {
    try {
        const { Name, Contact, Address, planDuration, batchType, amount, Remarks } = req.body;

        const interested = await InterestedStudent.create({
            Name,
            Contact,
            Address,
            planDuration,
            batchType,
            amount,
            Remarks
        });

        res.status(201).json({
            message: 'Application submitted! We will contact you soon.',
            interested
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting form', error: error.message });
    }
};

// @desc    Change password
// @route   PUT /api/students/change-password
// @access  Private/Student
const changePassword = async (req, res) => {
    try {
        const { CurrentPassword, NewPassword } = req.body;
        const student = await Student.findById(req.user.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check current password
        const isMatch = await bcrypt.compare(CurrentPassword, student.Password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        student.Password = await bcrypt.hash(NewPassword, salt);
        student.mustChangePassword = false;

        await student.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password', error: error.message });
    }
};

module.exports = { getProfile, requestProfileUpdate, submitInterested, changePassword };
