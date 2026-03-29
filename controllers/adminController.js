const Student = require('../models/Student');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const Fee = require('../models/Fee');
const Issue = require('../models/Issue');
const InterestedStudent = require('../models/InterestedStudent');
const RejectedStudent = require('../models/RejectedStudent');
const bcrypt = require('bcryptjs');
const Notification = require('../models/Notification');
const { sendPushToStudent } = require('../utils/pushHelper');
const Attendance = require('../models/Attendance');
const SystemConfig = require('../models/SystemConfig');

// @desc    Add new student
// @route   POST /api/admin/students
// @access  Private/Admin
const addStudent = async (req, res) => {
    try {
        const {
            FirstName, LastName, Email, Contact, LibraryID, AadharNumber,
            JoiningDate, SeatNo, planDuration, batchType, amount, mustChangePassword,
            DOB, Gender, FatherName, City, Area, Pincode, batchTiming
        } = req.body;

        if (Email) {
            const studentExists = await Student.findOne({ Email });
            if (studentExists) {
                return res.status(400).json({ message: `Email is already registered to ${studentExists.FullName || studentExists.FirstName}` });
            }
        }
        
        const contactExists = await Student.findOne({ Contact });
        if (contactExists) {
            return res.status(400).json({ message: `Contact number is already connected to ${contactExists.FullName || contactExists.FirstName}` });
        }
        
        if (LibraryID) {
            const libExists = await Student.findOne({ LibraryID });
            if (libExists) {
                return res.status(400).json({ message: `Library ID is already assigned to ${libExists.FullName || libExists.FirstName}` });
            }
        }

        if (AadharNumber) {
            const aadharExists = await Student.findOne({ AadharNumber });
            if (aadharExists) {
                return res.status(400).json({ message: `Aadhar Number is already connected to ${aadharExists.FullName || aadharExists.FirstName}` });
            }
        }

        // Generate a default password from the phone number
        const defaultPassword = Contact || 'Default123!';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);
        
        // Build payload cleanly
        const studentPayload = {
            FirstName, LastName, Contact, SeatNo, planDuration, batchType, amount,
            mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : true,
            DOB, Gender, FatherName, City, Area, Pincode, batchTiming,
            Password: hashedPassword,
            AccountStatus: 'Active'
        };

        if (Email) studentPayload.Email = Email;
        if (LibraryID) studentPayload.LibraryID = LibraryID;
        if (AadharNumber) studentPayload.AadharNumber = AadharNumber;
        if (JoiningDate) studentPayload.JoiningDate = JoiningDate;

        const student = await Student.create(studentPayload);

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
        const students = await Student.find({}).sort({ JoiningDate: -1 }).select('-Password');
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
            // Prevent double-booking a seat for the same timing during update
            const newSeatNo = req.body.SeatNo !== undefined ? req.body.SeatNo : student.SeatNo;
            const newBatchTiming = req.body.batchTiming !== undefined ? req.body.batchTiming : student.batchTiming;
            const newStatus = req.body.AccountStatus || student.AccountStatus;

            if (newSeatNo && newBatchTiming && newStatus === 'Active') {
                const seatConflict = await Student.findOne({
                    SeatNo: newSeatNo,
                    batchTiming: newBatchTiming,
                    AccountStatus: 'Active',
                    _id: { $ne: student._id }
                });
                if (seatConflict) {
                    return res.status(400).json({ message: `Seat ${newSeatNo} is already occupied by ${seatConflict.FullName || seatConflict.FirstName} during '${newBatchTiming}'.` });
                }
            }

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
            // New Plan/Batch features
            if (req.body.planDuration !== undefined) student.planDuration = req.body.planDuration;
            if (req.body.batchType !== undefined) student.batchType = req.body.batchType;
            if (req.body.amount !== undefined) student.amount = req.body.amount;
            if (req.body.batchTiming !== undefined) student.batchTiming = req.body.batchTiming;
            if (req.body.JoiningDate !== undefined) student.JoiningDate = req.body.JoiningDate;
            student.LibraryID = req.body.LibraryID !== undefined ? req.body.LibraryID : student.LibraryID;

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
        const { type, customMessage, title: customTitle, message: customRawMessage } = req.body;
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let pushMessage = '';
        let title = 'Library Update';

        if (customTitle && customRawMessage) {
            title = customTitle;
            pushMessage = customRawMessage;
        } else if (type === 'fee_reminder') {
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
            return res.status(400).json({ message: 'Invalid notification type/payload' });
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
        const { approvedFields } = req.body;
        const request = await ProfileUpdateRequest.findById(req.params.id);
        if (!request || (request.Status !== 'Pending' && request.Status !== 'Under Review')) {
            return res.status(404).json({ message: 'Request not found or already processed' });
        }

        const student = await Student.findById(request.StudentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const dataToApply = {};
        let rejectedFields = [];

        // If approvedFields array is provided, only apply those
        if (approvedFields && Array.isArray(approvedFields)) {
            for (const key of Object.keys(request.ProposedData)) {
                if (approvedFields.includes(key)) {
                    dataToApply[key] = request.ProposedData[key];
                } else {
                    rejectedFields.push(key);
                }
            }
        } else {
            // Backward compatibility or full approval
            Object.assign(dataToApply, request.ProposedData);
        }

        // Apply proposed data
        if (dataToApply.Email && dataToApply.Email !== student.Email) {
            student.isEmailVerified = false; // Reset verification on change
        }
        Object.assign(student, dataToApply);
        await student.save();

        request.Status = 'Approved';
        
        let message = 'Hi {FirstName}, your requested profile changes have been successfully applied.';
        
        if (rejectedFields.length > 0) {
            request.AdminNote = `Approved: ${approvedFields.join(', ')}. Rejected: ${rejectedFields.join(', ')}.`;
            message = `Hi {FirstName}, some of your requested changes (${approvedFields.join(', ')}) were approved. Other changes were rejected.`;
        }

        await request.save();

        await sendPushToStudent(request.StudentId, {
            title: 'Profile Request Update',
            message: message,
            url: '/student/dashboard.html#profile'
        });

        res.json({ message: 'Profile request processed', student });
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

        // Prevent double-booking a seat for the same timing
        const finalSeatNo = SeatNo || '';
        const finalBatchTiming = batchTiming || '';
        if (finalSeatNo && finalBatchTiming) {
            const seatConflict = await Student.findOne({ SeatNo: finalSeatNo, batchTiming: finalBatchTiming, AccountStatus: 'Active' });
            if (seatConflict) {
                return res.status(400).json({ message: `Conflict: Seat ${finalSeatNo} is already occupied by ${seatConflict.FullName || seatConflict.FirstName} during '${finalBatchTiming}'.` });
            }
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

// @desc    Get Daily Attendance
// @route   GET /api/admin/attendance
// @access  Private/Admin
const getDailyAttendance = async (req, res) => {
    try {
        // Defaults to today if no date passed
        const dateString = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const records = await Attendance.find({ DateString: dateString }).populate('StudentId', 'FullName LibraryID Contact ProfilePictureURL');
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
};

// @desc    Manually check in a student
// @route   POST /api/admin/attendance
// @access  Private/Admin
const manualCheckIn = async (req, res) => {
    try {
        const { studentId } = req.body;
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const now = new Date();
        const dateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (!student.batchTiming || student.batchTiming.trim() === '') {
            return res.status(400).json({ message: 'Cannot check in: Student does not have a Batch Timing defined in their profile.' });
        }

        let attendance = await Attendance.findOne({ StudentId: studentId, DateString: dateString });
        if (attendance) {
            return res.status(400).json({ message: 'Student is already checked in for today.' });
        }

        attendance = await Attendance.create({
            StudentId: studentId,
            LibraryID: student.LibraryID,
            DateString: dateString,
            CheckInTime: now
        });

        res.status(201).json({ message: 'Student checked in manually.', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Error checking in', error: error.message });
    }
};

// @desc    Manually check out a student
// @route   PUT /api/admin/attendance/:id/checkout
// @access  Private/Admin
const manualCheckOut = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
        if (attendance.CheckOutTime) return res.status(400).json({ message: 'Student is already checked out.' });

        const now = new Date();
        const diffHours = (now - attendance.CheckInTime) / (1000 * 60 * 60);

        attendance.CheckOutTime = now;
        attendance.TotalHours = diffHours;
        attendance.CheckOutMethod = 'Admin';
        await attendance.save();

        res.json({ message: 'Manually checked out successfully.', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Error checking out', error: error.message });
    }
};

// @desc    Get Seat Configuration
// @route   GET /api/admin/config/seats
// @access  Private/Admin
const getSeatConfig = async (req, res) => {
    try {
        let config = await SystemConfig.findOne({ key: 'seat_layout_config' });
        if (!config) config = await SystemConfig.create({ key: 'seat_layout_config', value: { halls: [] } });
        res.json(config.value);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Seat Configuration
// @route   PUT /api/admin/config/seats
// @access  Private/Admin
const updateSeatConfig = async (req, res) => {
    try {
        const { halls } = req.body;
        await SystemConfig.findOneAndUpdate({ key: 'seat_layout_config' }, { value: { halls } }, { upsert: true });
        res.json({ message: 'Seat configuration updated successfully', halls });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student fee timeline
// @route   GET /api/admin/students/:id/fee-timeline
// @access  Private/Admin
const getStudentFeeTimeline = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const fees = await Fee.find({ StudentId: student._id });
        
        const joinDate = new Date(student.JoiningDate || student.createdAt);
        const currentDate = new Date();
        let maxDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // If the student has paid fees for future months, extend the timeline
        fees.forEach(f => {
            if (f.Month) {
                const parsedDate = new Date(f.Month);
                if (!isNaN(parsedDate) && parsedDate > maxDate) {
                    maxDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
                }
            }
        });
        
        const timeline = [];
        let iterDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
        const endDate = maxDate;
        
        const planDuration = student.planDuration || 'Monthly';
        let monthIncrement = 1;
        if (planDuration === 'Quarterly') monthIncrement = 3;
        else if (planDuration === 'Half-Yearly') monthIncrement = 6;
        else if (planDuration === 'Yearly') monthIncrement = 12;
        
        while (iterDate <= endDate) {
            let rawMonthName = iterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            // For older node/OS that use invisible characters (like u202f), replace all whitespaces with a regular space
            const monthName = rawMonthName.replace(/\s+/g, ' ').trim();
            const expectedAmount = student.amount || 0;
            
            const feeRecord = fees.find(f => {
                if(!f.Month) return false;
                const safeFMonth = f.Month.replace(/\s+/g, ' ').trim().toLowerCase();
                return safeFMonth === monthName.toLowerCase();
            });
            
            timeline.push({
                month: monthName,
                expectedAmount,
                status: feeRecord ? feeRecord.Status : 'Unpaid',
                record: feeRecord || null
            });
            
            iterDate.setMonth(iterDate.getMonth() + monthIncrement);
        }
        
        timeline.reverse();
        res.json(timeline);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fee timeline', error: error.message });
    }
};

// @desc    Override mark fee as paid
// @route   POST /api/admin/students/:id/mark-fee-paid
// @access  Private/Admin
const markStudentFeePaid = async (req, res) => {
    try {
        const { Month, Amount, AdminNote, LibraryID, Batch } = req.body;
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        
        // Auto-generate unique ReceiptNo starting from 3000
        let nextReceiptNum = 3000;
        const config = await SystemConfig.findOne({ key: 'receipt_counter' });
        if (config && config.value && config.value.current) {
            nextReceiptNum = Math.max(3000, config.value.current);
        }
        // Ensure no collision with manually entered receipts from "Verify Fees"
        while (await Fee.findOne({ ReceiptNo: String(nextReceiptNum) })) {
            nextReceiptNum++;
        }
        await SystemConfig.findOneAndUpdate(
            { key: 'receipt_counter' },
            { value: { current: nextReceiptNum + 1 } },
            { upsert: true }
        );
        
        // Calculate Covered Months based on plan
        let monthInc = 1;
        if (student.planDuration === 'Quarterly') monthInc = 3;
        else if (student.planDuration === 'Half-Yearly') monthInc = 6;
        else if (student.planDuration === 'Yearly') monthInc = 12;

        const coveredMonths = [];
        const baseDate = new Date(Month);
        if (!isNaN(baseDate.getTime())) {
            for (let i = 0; i < monthInc; i++) {
                const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
                coveredMonths.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            }
        } else {
            coveredMonths.push(Month);
        }

        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexMonths = coveredMonths.map(m => new RegExp(`^${escapeRegExp(m)}$`, 'i'));

        const existingFee = await Fee.findOne({ 
            StudentId: student._id, 
            $or: [
                { Month: { $in: regexMonths } },
                { CoveredMonths: { $in: coveredMonths } }
            ]
        });
        if (existingFee && existingFee.Status === 'Paid') {
            return res.status(400).json({ message: `Conflict: A fee covering part or all of these months (${existingFee.Month}) is already paid.` });
        }
        
        if (existingFee) {
            existingFee.Status = 'Paid';
            existingFee.AdminNote = AdminNote || 'Marked paid by Admin';
            existingFee.Amount = Amount || student.amount || 0;
            existingFee.LibraryID = LibraryID || student.LibraryID;
            existingFee.Batch = Batch || student.batchType;
            existingFee.ReceiptNo = String(nextReceiptNum);
            existingFee.CoveredMonths = coveredMonths;
            await existingFee.save();
        } else {
            await Fee.create({
                StudentId: student._id,
                LibraryID: LibraryID || student.LibraryID,
                Month,
                CoveredMonths: coveredMonths,
                Amount: Amount || student.amount || 0,
                Batch: Batch || student.batchType,
                Status: 'Paid',
                ProofImageURL: 'N/A',
                AdminNote: AdminNote || 'Marked paid by Admin',
                ReceiptNo: String(nextReceiptNum)
            });
        }
        res.json({ message: 'Fee marked as paid successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking fee as paid', error: error.message });
    }
};

// @desc    Get all notifications globally (for admin tracking)
// @route   GET /api/admin/notifications/global
// @access  Private/Admin
const getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .populate('StudentId', 'FullName LibraryID Contact ProfilePictureURL')
            .sort({ createdAt: -1 }); // Newest first
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching global notifications', error: error.message });
    }
};

// @desc    Get next available receipt number
// @route   GET /api/admin/next-receipt-number
// @access  Private/Admin
const getNextReceiptNumber = async (req, res) => {
    try {
        let nextReceiptNum = 3000;
        const config = await SystemConfig.findOne({ key: 'receipt_counter' });
        if (config && config.value && config.value.current) {
            nextReceiptNum = Math.max(3000, config.value.current);
        }
        // Ensure no collision with manually entered receipts
        while (await Fee.findOne({ ReceiptNo: String(nextReceiptNum) })) {
            nextReceiptNum++;
        }
        res.json({ nextReceiptNumber: nextReceiptNum });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching next receipt number', error: error.message });
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
    getStudentNotifications,
    getDailyAttendance,
    manualCheckIn,
    manualCheckOut,
    getSeatConfig,
    updateSeatConfig,
    getStudentFeeTimeline,
    markStudentFeePaid,
    getAllNotifications,
    getNextReceiptNumber
};
