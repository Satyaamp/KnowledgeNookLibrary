const Student = require('../models/Student');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const Fee = require('../models/Fee');
const Issue = require('../models/Issue');
const InterestedStudent = require('../models/InterestedStudent');
const RejectedStudent = require('../models/RejectedStudent');
const bcrypt = require('bcryptjs');

// @desc    Add new student
// @route   POST /api/admin/students
// @access  Private/Admin
const addStudent = async (req, res) => {
    try {
        const {
            FirstName, LastName, DOB, Gender, Email, Contact,
            Password, FatherName, City, Area, Pincode,
            AadharNumber, SeatNo, CurrentBatch, LibraryID
        } = req.body;

        const studentExists = await Student.findOne({ Email });
        if (studentExists) {
            return res.status(400).json({ message: 'Student already exists with this email' });
        }

        // Hash the initial password for the student
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);

        const student = await Student.create({
            FirstName, LastName, DOB, Gender, Email, Contact,
            Password: hashedPassword, FatherName, City, Area, Pincode,
            AadharNumber, SeatNo, CurrentBatch, LibraryID,
            AccountStatus: 'Active' // Creating directly from admin makes it active
        });

        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error adding student', error: error.message });
    }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private/Admin
const getStudents = async (req, res) => {
    try {
        const students = await Student.find({}).select('-Password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
};

// @desc    Update student (Seat, Batch, Status, etc)
// @route   PUT /api/admin/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (student) {
            // Update all fields if provided in body
            student.FirstName = req.body.FirstName || student.FirstName;
            student.LastName = req.body.LastName !== undefined ? req.body.LastName : student.LastName;
            student.Email = req.body.Email || student.Email;
            student.Contact = req.body.Contact || student.Contact;
            student.DOB = req.body.DOB || student.DOB;
            student.Gender = req.body.Gender || student.Gender;
            student.AadharNumber = req.body.AadharNumber || student.AadharNumber;
            student.FatherName = req.body.FatherName || student.FatherName;
            student.City = req.body.City || student.City;
            student.Area = req.body.Area || student.Area;
            student.Pincode = req.body.Pincode || student.Pincode;
            student.AccountStatus = req.body.AccountStatus || student.AccountStatus;
            student.SeatNo = req.body.SeatNo !== undefined ? req.body.SeatNo : student.SeatNo;
            student.CurrentBatch = req.body.CurrentBatch !== undefined ? req.body.CurrentBatch : student.CurrentBatch;
            student.LibraryID = req.body.LibraryID !== undefined ? req.body.LibraryID : student.LibraryID;

            const updatedStudent = await student.save();
            res.json(updatedStudent);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        console.error('Update student error:', error);

        // Handle MongoDB duplicate key errors gracefully
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                message: `The ${field} '${error.keyValue[field]}' is already in use by another student.`
            });
        }

        res.status(500).json({ message: 'Error updating student', error: error.message, details: error.errors });
    }
};

// @desc    Get pending profile requests
// @route   GET /api/admin/profile-requests
// @access  Private/Admin
const getProfileRequests = async (req, res) => {
    try {
        const requests = await ProfileUpdateRequest.find({ Status: 'Pending' }).populate('StudentId', 'FullName Email Contact SeatNo CurrentBatch');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
};

// @desc    Approve profile request
// @route   PUT /api/admin/profile-requests/:id/approve
// @access  Private/Admin
const approveProfileRequest = async (req, res) => {
    try {
        const request = await ProfileUpdateRequest.findById(req.params.id);
        if (!request || request.Status !== 'Pending') {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        const student = await Student.findById(request.StudentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Apply proposed data
        Object.assign(student, request.ProposedData);
        await student.save();

        request.Status = 'Approved';
        await request.save();

        res.json({ message: 'Profile request approved and applied', student });
    } catch (error) {
        res.status(500).json({ message: 'Error approving request', error: error.message });
    }
};

// @desc    Reject profile request
// @route   PUT /api/admin/profile-requests/:id/reject
// @access  Private/Admin
const rejectProfileRequest = async (req, res) => {
    try {
        const request = await ProfileUpdateRequest.findById(req.params.id);
        if (!request || request.Status !== 'Pending') {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        request.Status = 'Rejected';
        await request.save();

        res.json({ message: 'Profile request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting request', error: error.message });
    }
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments({});
        const pendingStudents = await Student.countDocuments({ AccountStatus: 'Pending' });
        const pendingProfileRequests = await ProfileUpdateRequest.countDocuments({ Status: 'Pending' });
        const pendingFees = await Fee.countDocuments({ Status: 'Pending' });
        const openIssues = await Issue.countDocuments({ Status: { $in: ['Pending', 'Seen by Admin', 'In Progress'] } });

        res.json({
            totalStudents,
            pendingStudents,
            pendingProfileRequests,
            pendingFees,
            openIssues
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// @desc    Get interested students
// @route   GET /api/admin/interested-students
// @access  Private/Admin
const getInterestedStudents = async (req, res) => {
    try {
        const students = await InterestedStudent.find({ Status: { $in: ['Pending', 'Reviewed'] } }).sort({ SubmittedDate: -1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching interested students', error: error.message });
    }
};

// @desc    Mark interested student as reviewed
// @route   PUT /api/admin/interested-students/:id/review
// @access  Private/Admin
const markInterestedStudentReviewed = async (req, res) => {
    try {
        const student = await InterestedStudent.findById(req.params.id);
        if (student) {
            student.Status = 'Reviewed';
            await student.save();
            res.json(student);
        } else {
            res.status(404).json({ message: 'Record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

// @desc    Reject interested student
// @route   PUT /api/admin/interested-students/:id/reject
// @access  Private/Admin
const rejectInterestedStudent = async (req, res) => {
    try {
        const { Reason } = req.body;
        const student = await InterestedStudent.findById(req.params.id);

        if (student) {
            await RejectedStudent.create({
                Name: student.Name,
                Contact: student.Contact,
                Reason: Reason || 'No reason provided'
            });

            await InterestedStudent.findByIdAndDelete(req.params.id);
            res.json({ message: 'Application rejected' });
        } else {
            res.status(404).json({ message: 'Record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting application', error: error.message });
    }
};

// @desc    Convert interested student to active account
// @route   POST /api/admin/convert-student/:id
// @access  Private/Admin
const convertInterestedStudent = async (req, res) => {
    try {
        const { SeatNo, CurrentBatch, JoiningDate, Email, LibraryID } = req.body;
        const interested = await InterestedStudent.findById(req.params.id);

        if (!interested) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Generate default password
        const defaultPassword = 'library@123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Name splitting
        const nameParts = interested.Name.split(' ');
        const FirstName = nameParts[0];
        const LastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        // Create student
        const newStudent = await Student.create({
            FirstName,
            LastName,
            Contact: interested.Contact,
            FullAddress: interested.Address,
            SeatNo: SeatNo || '',
            CurrentBatch: CurrentBatch || interested.PreferredBatch,
            JoiningDate: JoiningDate || Date.now(),
            Password: hashedPassword,
            Email: Email || undefined, // Allow sparse unique index
            AccountStatus: 'Active',
            mustChangePassword: true,
            LibraryID: LibraryID || undefined
        });

        // Mark as converted
        interested.Status = 'ConvertedToStudent';
        await interested.save();

        res.status(201).json({
            message: 'Account successfully created',
            student: newStudent,
            defaultPassword
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A student with this contact or email already exists.' });
        }
        res.status(500).json({ message: 'Error converting student', error: error.message });
    }
};

module.exports = {
    addStudent,
    getStudents,
    updateStudent,
    getProfileRequests,
    approveProfileRequest,
    rejectProfileRequest,
    getDashboardStats,
    getInterestedStudents,
    markInterestedStudentReviewed,
    rejectInterestedStudent,
    convertInterestedStudent
};
