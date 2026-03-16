const Student = require('../models/Student');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const Fee = require('../models/Fee');
const Issue = require('../models/Issue');
const InterestedStudent = require('../models/InterestedStudent');
const RejectedStudent = require('../models/RejectedStudent');
const bcrypt = require('bcryptjs');
const Notification = require('../models/Notification');
const { sendPushToStudent } = require('../utils/pushHelper');

// @desc    Add new student
// @route   POST /api/admin/students
// @access  Private/Admin
const addStudent = async (req, res) => {
    try {
        const {
            FirstName, LastName, DOB, Gender, Email, Contact,
            Password, FatherName, City, Area, Pincode,
            AadharNumber, SeatNo, CurrentBatch, LibraryID, batchTiming
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
            AadharNumber, SeatNo, CurrentBatch, LibraryID, batchTiming,
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
                if (req.body.Email && req.body.Email !== student.Email) {
                    student.isEmailVerified = false; // Reset verification on change
                }
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
            student.planDuration = req.body.planDuration !== undefined ? req.body.planDuration : student.planDuration;
            student.batchType = req.body.batchType !== undefined ? req.body.batchType : student.batchType;
            student.amount = req.body.amount !== undefined ? req.body.amount : student.amount;
            student.LibraryID = req.body.LibraryID !== undefined ? req.body.LibraryID : student.LibraryID;
            student.batchTiming = req.body.batchTiming !== undefined ? req.body.batchTiming : student.batchTiming;

            if (req.body.ResetPassword === true) {
                const salt = await bcrypt.genSalt(10);
                student.Password = await bcrypt.hash('library@123', salt);
                student.mustChangePassword = true;
            }

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

// @desc    Verify Aadhar Proof
// @route   PUT /api/admin/students/:id/verify-aadhar
// @access  Private/Admin
const verifyAadhar = async (req, res) => {
    try {
        const { status, reason } = req.body; // status: 'Verified' or 'Rejected'
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        student.AadharStatus = status;
        if (status === 'Rejected') {
            student.AadharRejectionReason = reason || 'Document not clear/valid';
        } else {
            student.AadharRejectionReason = undefined;
        }

        await student.save();

        let pushMessage = `Hi {FirstName}, your Aadhar proof was marked as ${status}.`;
        
        if (status === 'Rejected') {
            const adminNoteText = student.AadharRejectionReason ? ` Note: ${student.AadharRejectionReason}` : '';
            pushMessage += `${adminNoteText} Please re-upload a clear image from your profile.`;
        } else if (status === 'Verified') {
            pushMessage += ' Thank you!';
        }

        await sendPushToStudent(student._id, {
            title: `Aadhar ${status}`,
            message: pushMessage,
            url: '/student/dashboard.html#profile'
        });

        res.json({ message: `Aadhar marked as ${status}`, student });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying Aadhar', error: error.message });
    }
};

// @desc    Send manual push notification to a student
// @route   POST /api/admin/students/:id/notify
// @access  Private/Admin
const sendManualNotification = async (req, res) => {
    try {
        const { type, customMessage } = req.body;
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let pushMessage = '';
        let title = 'Library Update';

        if (type === 'fee_reminder') {
            title = 'Fee Reminder';
            pushMessage = `Hi {FirstName}, your fee proof for this month is not updated. Please upload a clear proof from your dashboard to avoid rejection.`;
        } else if (type === 'aadhar_reminder') {
            title = 'Aadhar Verification Pending';
            pushMessage = `Hi {FirstName}, your Aadhar verification is pending or was rejected. Please log in and re-upload a clear image of your Aadhar card.`;
        } else if (type === 'email_reminder') {
            title = 'Email Verification Pending';
            pushMessage = `Hi {FirstName}, your email address is not verified. Please log in to your dashboard and verify your email address to ensure you receive important updates.`;
        } else if (type === 'custom') {
            title = 'Message from Admin';
            pushMessage = customMessage || 'You have a new message from the admin.';
        } else {
            return res.status(400).json({ message: 'Invalid notification type' });
        }

        await sendPushToStudent(student._id, { title, message: pushMessage, url: '/student/dashboard.html#notifications' });
        res.json({ message: 'Notification sent successfully to student devices.' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notification', error: error.message });
    }
};

// @desc    Send bulk reminder notification to students who haven't uploaded Aadhar
// @route   POST /api/admin/aadhar/notify-not-uploaded
// @access  Private/Admin
const notifyNotUploadedAadhar = async (req, res) => {
    try {
        const students = await Student.find({ AadharStatus: 'Not Uploaded' });

        if (!students || students.length === 0) {
            return res.status(400).json({ message: 'No students found with Not Uploaded status.' });
        }

        let notifiedCount = 0;
        for (const student of students) {
            await sendPushToStudent(student._id, {
                title: 'Aadhar Upload Required',
                message: `Hi {FirstName}, please log in and upload your Aadhar proof to complete your account verification.`,
                url: '/student/dashboard.html#profile'
            });
            notifiedCount++;
        }

        res.json({ message: `Successfully queued reminders to ${notifiedCount} student(s).` });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notifications', error: error.message });
    }
};

// @desc    Get notification history for a student
// @route   GET /api/admin/students/:id/notifications
// @access  Private/Admin
const getStudentNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ StudentId: req.params.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

// @desc    Get pending profile requests
// @route   GET /api/admin/profile-requests
// @access  Private/Admin
const getProfileRequests = async (req, res) => {
    try {
        const requests = await ProfileUpdateRequest.find({ 
            Status: { $in: ['Pending', 'Under Review'] } 
        }).populate('StudentId', 'FullName Email Contact SeatNo CurrentBatch LibraryID');
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
        if (!request || (request.Status !== 'Pending' && request.Status !== 'Under Review')) {
            return res.status(404).json({ message: 'Request not found or already processed' });
        }

        const student = await Student.findById(request.StudentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Apply proposed data
            if (request.ProposedData.Email && request.ProposedData.Email !== student.Email) {
                student.isEmailVerified = false; // Reset verification on change
            }
        Object.assign(student, request.ProposedData);
        await student.save();

        request.Status = 'Approved';
        await request.save();

        await sendPushToStudent(request.StudentId, {
            title: 'Profile Request Approved',
            message: 'Hi {FirstName}, your requested profile changes have been successfully applied.',
            url: '/student/dashboard.html#profile'
        });

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
        const { reason } = req.body;
        const request = await ProfileUpdateRequest.findById(req.params.id);
        if (!request || (request.Status !== 'Pending' && request.Status !== 'Under Review')) {
            return res.status(404).json({ message: 'Request not found or already processed' });
        }

        request.Status = 'Rejected';
        request.AdminNote = reason || 'No reason provided.';
        await request.save();

        await sendPushToStudent(request.StudentId, {
            title: 'Profile Request Rejected',
            message: 'Hi {FirstName}, your profile update request was rejected. Check your requests history for details.',
            url: '/student/dashboard.html#requests'
        });

        res.json({ message: 'Profile request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting request', error: error.message });
    }
};

// @desc    Update profile request status (e.g. Under Review)
// @route   PUT /api/admin/profile-requests/:id/status
// @access  Private/Admin
const updateProfileRequestStatus = async (req, res) => {
    try {
        const request = await ProfileUpdateRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.Status = req.body.Status;
        await request.save();
        res.json({ message: `Request status updated to ${req.body.Status}` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments({});
        const pendingStudents = await Student.countDocuments({ AccountStatus: 'Pending' });
        const activeStudents = await Student.countDocuments({ AccountStatus: 'Active' });
        const inactiveStudents = await Student.countDocuments({ AccountStatus: 'Inactive' });
        const pendingProfileRequests = await ProfileUpdateRequest.countDocuments({ Status: { $in: ['Pending', 'Under Review'] } });
        const pendingFees = await Fee.countDocuments({ Status: 'Pending' });
        const openIssues = await Issue.countDocuments({ Status: { $in: ['Pending', 'Seen by Admin', 'In Progress'] } });
        const pendingLeads = await InterestedStudent.countDocuments({ Status: 'Pending' });
        const pendingAadhar = await Student.countDocuments({ AadharStatus: 'Pending' });
        const verifiedAadhar = await Student.countDocuments({ AadharStatus: 'Verified' });
        const notUploadedAadhar = await Student.countDocuments({ AadharStatus: 'Not Uploaded' });

        // Total Revenue (Approved Fees)
        const revenueResult = await Fee.aggregate([
            { $match: { Status: { $in: ['Paid', 'Approved'] } } },
            { $group: { _id: null, total: { $sum: '$Amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Batch & Plan Distribution (Active Students)
        const allBatches = ['Basic', 'Fundamental', 'Standard', "Officer's"];
        const allPlans = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

        const distAgg = await Student.aggregate([
            { $match: { AccountStatus: 'Active' } },
            { $group: { _id: { batch: '$batchType', plan: '$planDuration' }, count: { $sum: 1 } } }
        ]);

        const distribution = allBatches.map(batch => {
            const plans = allPlans.map(plan => {
                const found = distAgg.find(d => d._id.batch === batch && d._id.plan === plan);
                return { name: plan, count: found ? found.count : 0 };
            });
            const total = plans.reduce((acc, curr) => acc + curr.count, 0);
            return { batch, total, plans };
        });

        // Gender Distribution (Active Students)
        const genderStats = await Student.aggregate([
            { $match: { AccountStatus: 'Active' } },
            { $group: { _id: '$Gender', count: { $sum: 1 } } }
        ]);

        res.json({
            totalStudents,
            pendingStudents,
            activeStudents,
            inactiveStudents,
            pendingProfileRequests,
            pendingFees,
            openIssues,
            pendingLeads,
            pendingAadhar,
            verifiedAadhar,
            notUploadedAadhar,
            totalRevenue,
            distribution,
            genderStats
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
        const { SeatNo, planDuration, batchType, batchTiming, amount, JoiningDate, Email, LibraryID } = req.body;
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
            planDuration: planDuration || interested.planDuration,
            batchType: batchType || interested.batchType,
            batchTiming: batchTiming || '',
            amount: amount || interested.amount,
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


// @desc    Bulk upload students via JSON array
// @route   POST /api/admin/students/bulk-upload
// @access  Private/Admin
const bulkUploadStudents = async (req, res) => {
    try {
        const studentsData = req.body.students;

        if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
            return res.status(400).json({ message: 'No valid students provided for upload.' });
        }
        
        // Hash the default password once for performance
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('library@123', salt);

        const pricingGrid = {
            "Monthly": { "Basic": 500, "Fundamental": 600, "Standard": 1000, "Officer's": 1400 },
            "Quarterly": { "Basic": 1197, "Fundamental": 1497, "Standard": 2500, "Officer's": 3590 },
            "Half-Yearly": { "Basic": 2300, "Fundamental": 2800, "Standard": 4800, "Officer's": 6900 },
            "Yearly": { "Basic": 4600, "Fundamental": 5600, "Standard": 9348, "Officer's": 13464 }
        };

        const studentsToInsert = [];

        for (const studentData of studentsData) {
            if (!studentData.FirstName || !studentData.Contact) {
                continue;
            }

            // Auto-calculate the amount based on the plan and batch
            let calcAmount = undefined;
            if (studentData.planDuration && studentData.batchType) {
                if (pricingGrid[studentData.planDuration] && pricingGrid[studentData.planDuration][studentData.batchType]) {
                    calcAmount = pricingGrid[studentData.planDuration][studentData.batchType];
                }
            }

            // Safely parse Dates from Excel
            let joiningDate = new Date();
            if (studentData.JoiningDate) {
                const parts = studentData.JoiningDate.split('/');
                if (parts.length === 3) {
                    joiningDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // Handles DD/MM/YYYY
                } else {
                    const parsed = Date.parse(studentData.JoiningDate);
                    if (!isNaN(parsed)) joiningDate = new Date(parsed);
                }
            }

            // Safely parse DOB from Excel
            let dobDate = undefined;
            if (studentData.DOB) {
                const parts = studentData.DOB.split('/');
                if (parts.length === 3) {
                    dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // Handles DD/MM/YYYY
                } else {
                    const parsed = Date.parse(studentData.DOB);
                    if (!isNaN(parsed)) dobDate = new Date(parsed);
                }
            }

            // Explicitly build FullName and FullAddress since insertMany bypasses save hooks
            const firstName = studentData.FirstName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            const lastName = studentData.LastName ? studentData.LastName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
            const fullName = lastName ? `${firstName} ${lastName}` : firstName;

            const fatherName = studentData.FatherName ? studentData.FatherName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : undefined;

            const area = studentData.Area ? studentData.Area.trim() : '';
            const city = studentData.City ? studentData.City.trim() : '';
            const pincode = studentData.Pincode ? String(studentData.Pincode).trim() : '';
            
            let fullAddress = '';
            const addressParts = [];
            if (area) addressParts.push(area);
            if (city) addressParts.push(city);
            fullAddress = addressParts.join(', ');
            if (pincode) fullAddress += fullAddress ? ` - ${pincode}` : pincode;

            studentsToInsert.push({
                FirstName: firstName,
                LastName: lastName || undefined,
                FullName: fullName,
                DOB: dobDate,
                Gender: studentData.Gender || undefined,
                Email: studentData.Email || undefined,
                Contact: studentData.Contact,
                FatherName: fatherName,
                City: city || undefined,
                Pincode: pincode || undefined,
                Area: area || undefined,
                FullAddress: fullAddress || undefined,
                AadharNumber: studentData.AadharNumber || undefined,
                JoiningDate: joiningDate,
                LibraryID: studentData.LibraryID || undefined,
                SeatNo: studentData.SeatNo || undefined,
                planDuration: studentData.planDuration || undefined,
                batchType: studentData.batchType || undefined,
                amount: calcAmount,
                Password: hashedPassword,
                AccountStatus: 'Active',
                mustChangePassword: studentData.mustChangePassword ? String(studentData.mustChangePassword).toLowerCase() !== 'false' : true
            });
        }

        // Insert documents. ordered: false allows it to skip duplicates safely
        if (studentsToInsert.length > 0) {
            try { await Student.insertMany(studentsToInsert, { ordered: false }); } 
            catch (err) { console.error('Bulk insert error:', err); }
        }

        res.status(201).json({ message: `Successfully processed batch. Check the list for newly added students. (Duplicate phone numbers or IDs were skipped).` });
    } catch (error) {
        res.status(500).json({ message: 'Error processing bulk upload', error: error.message });
    }
};

module.exports = {
    addStudent,
    bulkUploadStudents,
    getStudents,
    updateStudent,
    getProfileRequests,
    approveProfileRequest,
    rejectProfileRequest,
    getDashboardStats,
    getInterestedStudents,
    markInterestedStudentReviewed,
    rejectInterestedStudent,
    convertInterestedStudent,
    updateProfileRequestStatus,
    verifyAadhar,
    notifyNotUploadedAadhar,
    sendManualNotification,
    getStudentNotifications
};
