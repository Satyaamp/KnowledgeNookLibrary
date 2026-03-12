const Student = require('../models/Student');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const InterestedStudent = require('../models/InterestedStudent');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

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
            Status: { $in: ['Pending', 'Under Review'] }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'A pending request already exists. Please wait for admin approval.' });
        }

        const student = await Student.findById(req.user.id);
        
        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        const request = await ProfileUpdateRequest.create({
            StudentId: req.user.id,
            LibraryID: student ? student.LibraryID : undefined,
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

// @desc    Update Profile Picture
// @route   POST /api/students/update-profile-pic
// @access  Private/Student
const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        // Upload to Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'student_profiles'
        });

        const student = await Student.findById(req.user.id);
        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        student.ProfilePictureURL = result.secure_url;
        await student.save();

        res.json({ message: 'Profile picture updated', profilePictureURL: result.secure_url });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile picture', error: error.message });
    }
};

// @desc    Upload/Update Aadhar Proof
// @route   POST /api/students/update-aadhar
// @access  Private/Student
const updateAadhar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Upload to Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'student_aadhar_proofs'
        });

        const student = await Student.findById(req.user.id);
        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        student.AadharProofURL = result.secure_url;
        student.AadharStatus = 'Pending'; // Reset to pending on new upload
        student.AadharRejectionReason = undefined; // Clear previous rejection reason
        await student.save();

        res.json({ message: 'Aadhar proof uploaded successfully', aadharProofURL: result.secure_url, status: 'Pending' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating Aadhar proof', error: error.message });
    }
};

// @desc    Get my pending profile update request
// @route   GET /api/students/profile-update-request
// @access  Private/Student
const getMyProfileRequest = async (req, res) => {
    try {
        const request = await ProfileUpdateRequest.findOne({
            StudentId: req.user.id,
        }).sort({ createdAt: -1 }); // Get latest
        res.json(request || null);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching request', error: error.message });
    }
};

// @desc    Mark a profile update request notification as seen by the student
// @route   PUT /api/students/profile-update-request/:id/seen
// @access  Private/Student
const markRequestAsSeen = async (req, res) => {
    try {
        const request = await ProfileUpdateRequest.findOne({
            _id: req.params.id,
            StudentId: req.user.id
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found for this student.' });
        }

        request.SeenByStudent = true;
        await request.save();

        res.json({ message: 'Notification marked as seen.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification status', error: error.message });
    }
};

// @desc    Get all my profile update requests (History with Pagination)
// @route   GET /api/students/profile-requests
// @access  Private/Student
const getAllMyProfileRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const total = await ProfileUpdateRequest.countDocuments({ StudentId: req.user.id, HiddenByStudent: { $ne: true } });
        const requests = await ProfileUpdateRequest.find({ StudentId: req.user.id, HiddenByStudent: { $ne: true } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            requests,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
};

// @desc    Soft delete (hide) a profile request. Cancels if pending.
// @route   DELETE /api/students/profile-requests/:id
// @access  Private/Student
const deleteProfileRequest = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (student && student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        const request = await ProfileUpdateRequest.findOne({
            _id: req.params.id,
            StudentId: req.user.id
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Prevent deletion if the request is still active (Pending or Under Review)
        if (['Pending', 'Under Review'].includes(request.Status)) {
            return res.status(400).json({ message: 'Cannot delete requests that are Pending or Under Review.' });
        }

        // Hide from student view (Soft Delete)
        request.HiddenByStudent = true;
        request.Flag = 'D';
        await request.save();

        res.json({ message: 'Request removed.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing request', error: error.message });
    }
};

// @desc    Bulk soft delete (hide) profile requests
// @route   DELETE /api/students/profile-requests
// @access  Private/Student
const deleteManyProfileRequests = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (student && student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No requests selected.' });
        }

        // Only hide requests that are NOT pending or under review
        await ProfileUpdateRequest.updateMany(
            { 
                _id: { $in: ids }, 
                StudentId: req.user.id,
                Status: { $nin: ['Pending', 'Under Review'] } 
            },
            { $set: { HiddenByStudent: true, Flag: 'D' } }
        );

        res.json({ message: 'Selected requests removed.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing requests', error: error.message });
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

        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
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

module.exports = { getProfile, requestProfileUpdate, submitInterested, changePassword, getMyProfileRequest, markRequestAsSeen, getAllMyProfileRequests, deleteProfileRequest, deleteManyProfileRequests, updateProfilePicture, updateAadhar };
