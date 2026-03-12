const Fee = require('../models/Fee');
const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');

// @desc    Upload fee receipt
// @route   POST /api/fees/upload
// @access  Private/Student
const uploadFee = async (req, res) => {
    try {
        const { Month, Amount, Batch } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image receipt' });
        }

        // Convert buffer to base64 for Cloudinary upload
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'library_fees'
        });

        const student = await Student.findById(req.user.id);

        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        const fee = await Fee.create({
            StudentId: req.user.id,
            LibraryID: student ? student.LibraryID : undefined,
            Month,
            Amount,
            Batch,
            ProofImageURL: result.secure_url,
            Status: 'Pending'
        });

        res.status(201).json(fee);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading fee', error: error.message });
    }
};

// @desc    Get my fee statuses
// @route   GET /api/fees/status
// @access  Private/Student
const getMyFees = async (req, res) => {
    try {
        const fees = await Fee.find({ StudentId: req.user.id }).sort({ createdAt: -1 });
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fees', error: error.message });
    }
};

// @desc    Get all fee records (Admin)
// @route   GET /api/fees
// @access  Private/Admin
const getAllFees = async (req, res) => {
    try {
        const fees = await Fee.find({}).sort({ createdAt: -1 }).populate('StudentId', 'LibraryID FullName SeatNo Contact batchType planDuration');
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all fees', error: error.message });
    }
};

// @desc    Verify/Update fee status
// @route   PUT /api/fees/:id/verify
// @access  Private/Admin
const verifyFee = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (fee) {
            fee.Status = req.body.Status || fee.Status; // Can be 'Paid' or 'Rejected'/'Pending' depending on rules

            if (req.body.AdminNote !== undefined) {
                fee.AdminNote = req.body.AdminNote;
            }

            const updatedFee = await fee.save();
            res.json(updatedFee);
        } else {
            res.status(404).json({ message: 'Fee record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating fee status', error: error.message });
    }
};

module.exports = { uploadFee, getMyFees, getAllFees, verifyFee };
