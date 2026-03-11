const Administrator = require('../models/Administrator');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// @desc    Auth user & get token (Unified login for Student & Admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Please provide email, password, and role' });
    }

    try {
        if (role === 'admin') {
            const admin = await Administrator.findOne({ Email: email.toLowerCase() });
            if (admin && (await admin.matchPassword(password))) {
                res.json({
                    _id: admin._id,
                    name: admin.Name,
                    email: admin.Email,
                    role: 'admin',
                    token: generateToken(admin._id, 'admin'),
                });
            } else {
                res.status(401).json({ message: 'Invalid email or password' });
            }
        } else if (role === 'student') {
            const student = await Student.findOne({
                $or: [
                    { Email: email },
                    { Contact: email }
                ]
            });
            if (student && (await bcrypt.compare(password, student.Password))) {
                res.json({
                    _id: student._id,
                    name: student.FullName,
                    email: student.Email,
                    role: 'student',
                    accountStatus: student.AccountStatus,
                    token: generateToken(student._id, 'student'),
                });
            } else {
                res.status(401).json({ message: 'Invalid email or password' });
            }
        } else {
            res.status(400).json({ message: 'Invalid role specified' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// @desc    Register a new admin (Setup purposes only)
// @route   POST /api/auth/register-admin
// @access  Public
const registerAdmin = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const adminExists = await Administrator.findOne({ Email: email.toLowerCase() });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const admin = await Administrator.create({
            Name: name,
            Email: email.toLowerCase(),
            Password: password,
        });

        if (admin) {
            res.status(201).json({
                _id: admin._id,
                name: admin.Name,
                email: admin.Email,
                token: generateToken(admin._id, 'admin'),
            });
        } else {
            res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Register a new student (Seat Application)
// @route   POST /api/auth/register-student
// @access  Public
const registerStudent = async (req, res) => {
    const {
        FirstName, LastName, DOB, Gender, Email, Contact,
        Password, FatherName, City, Area, Pincode, AadharNumber
    } = req.body;

    try {
        if (!req.files || !req.files['ProfilePicture'] || !req.files['AadharProof']) {
            return res.status(400).json({ message: 'Both Profile Picture and Aadhar Proof images are required' });
        }

        const email = Email ? Email.toLowerCase() : '';
        const existingStudent = await Student.findOne({
            $or: [
                { Email: email },
                { Contact: Contact },
                { AadharNumber: AadharNumber }
            ]
        });

        if (existingStudent) {
            if (existingStudent.Email === email) {
                return res.status(400).json({ message: 'Student already exists with this email' });
            }
            if (existingStudent.Contact === Contact) {
                return res.status(400).json({ message: 'Student already exists with this phone number' });
            }
            if (existingStudent.AadharNumber === AadharNumber) {
                return res.status(400).json({ message: 'Student already exists with this Aadhar number' });
            }
        }

        // Upload Profile Picture
        const profileB64 = Buffer.from(req.files['ProfilePicture'][0].buffer).toString("base64");
        const profileDataURI = "data:" + req.files['ProfilePicture'][0].mimetype + ";base64," + profileB64;
        const profileResult = await cloudinary.uploader.upload(profileDataURI, { folder: 'student_profiles' });

        // Upload Aadhar Proof
        const aadharB64 = Buffer.from(req.files['AadharProof'][0].buffer).toString("base64");
        const aadharDataURI = "data:" + req.files['AadharProof'][0].mimetype + ";base64," + aadharB64;
        const aadharResult = await cloudinary.uploader.upload(aadharDataURI, { folder: 'student_aadhar_proofs' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);

        const student = await Student.create({
            FirstName, LastName, DOB, Gender, Email: email, Contact,
            Password: hashedPassword, FatherName, City, Area, Pincode,
            AadharNumber,
            ProfilePictureURL: profileResult.secure_url,
            AadharProofURL: aadharResult.secure_url,
            SeatNo: 'Pending', // Seat defaults to pending upon application
            CurrentBatch: 'Pending',
            AccountStatus: 'Pending' // Admin must review and make 'Active'
        });

        if (student) {
            res.status(201).json({
                message: 'Application submitted successfully. Waiting for admin approval.',
                email: student.Email
            });
        } else {
            res.status(400).json({ message: 'Invalid student data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { login, registerAdmin, registerStudent };
