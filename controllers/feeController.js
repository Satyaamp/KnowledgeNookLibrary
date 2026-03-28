const Fee = require('../models/Fee');
const Student = require('../models/Student');
const cloudinary = require('../config/cloudinary');
const { sendPushToStudent } = require('../utils/pushHelper');

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

        // Format month strictly to ensure we catch variations like "march 2025" vs "March 2025"
        const formattedMonth = Month.trim().replace(/\s+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedMonth = escapeRegExp(formattedMonth);

        // Check if ANY fee already exists for this month
        let fee = await Fee.findOne({
            StudentId: req.user.id,
            Month: { $regex: new RegExp(`^${escapedMonth}$`, 'i') }
        });

        if (fee) {
            // Prevent re-uploading if it's already Paid or Pending
            if (fee.Status === 'Paid' || fee.Status === 'Approved') {
                return res.status(400).json({ message: `Fee for ${formattedMonth} has already been marked as Paid.` });
            }
            if (fee.Status === 'Pending') {
                return res.status(400).json({ message: `Receipt for ${formattedMonth} is already under review. Please wait for admin action.` });
            }

            // If it is 'Rejected', proceed with overwriting the image and marking it 'Pending' again
            // Delete old image from Cloudinary if it exists
            if (fee.ProofImageURL) {
                try {
                    const urlParts = fee.ProofImageURL.split('/');
                    const filename = urlParts.pop();
                    const folder = urlParts.pop();
                    const publicId = `${folder}/${filename.split('.')[0]}`;
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Failed to delete old image:', err);
                }
            }

            // Update existing fee record
            fee.ProofImageURL = result.secure_url;
            fee.Status = 'Pending';
            fee.AdminNote = undefined; // Clear the rejection reason
            fee.Amount = Amount;
            fee.Batch = Batch;
            fee.isResubmitted = true; // Mark as a resubmission!
            await fee.save();
        } else {
            // Create a brand new record if none exists
            fee = await Fee.create({
                StudentId: req.user.id,
                LibraryID: student ? student.LibraryID : undefined,
                Month: formattedMonth,
                Amount,
                Batch,
                ProofImageURL: result.secure_url,
                Status: 'Pending'
            });
        }

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

            if (req.body.ReceiptNo !== undefined) {
                fee.ReceiptNo = req.body.ReceiptNo;
            }

            // Handle Cloudinary image deletion if flagged by admin
            if (req.body.deleteReceipt === true && fee.ProofImageURL) {
                try {
                    const urlParts = fee.ProofImageURL.split('/');
                    const filename = urlParts.pop();
                    const folder = urlParts.pop();
                    const publicId = `${folder}/${filename.split('.')[0]}`;
                    
                    await cloudinary.uploader.destroy(publicId);
                    fee.ProofImageURL = undefined; // Remove URL from DB
                } catch (cloudinaryError) {
                    console.error('Failed to delete image from Cloudinary:', cloudinaryError);
                }
            }

            const updatedFee = await fee.save({ validateBeforeSave: false });

            // Send push notification
            let pushMessage = `Hi {FirstName}, your fee for ${fee.Month} was marked as ${fee.Status}.`;
            
            if (fee.Status === 'Rejected') {
                const adminNoteText = fee.AdminNote ? ` Note: ${fee.AdminNote}` : '';
                pushMessage += `${adminNoteText} Please re-upload a clear proof of payment from your dashboard.`;
            } else if (fee.Status === 'Paid' || fee.Status === 'Approved') {
                pushMessage += ' Thank you for your payment!';
            }
            await sendPushToStudent(fee.StudentId, {
                title: `Fee Payment ${fee.Status}`,
                message: pushMessage,
                url: '/student/dashboard.html#fees'
            });

            res.json(updatedFee);
        } else {
            res.status(404).json({ message: 'Fee record not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating fee status', error: error.message });
    }
};

// @desc    Delete fee receipt image explicitly
// @route   DELETE /api/fees/:id/receipt
// @access  Private/Admin
const deleteReceiptImage = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        if (!fee.ProofImageURL) {
            return res.status(400).json({ message: 'No receipt image found for this fee' });
        }

        // Extract public_id and delete from Cloudinary
        const urlParts = fee.ProofImageURL.split('/');
        const filename = urlParts.pop();
        const folder = urlParts.pop();
        const publicId = `${folder}/${filename.split('.')[0]}`;

        await cloudinary.uploader.destroy(publicId);

        fee.ProofImageURL = undefined;
        await fee.save({ validateBeforeSave: false });

        res.json({ message: 'Receipt image successfully deleted' });
    } catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = { uploadFee, getMyFees, getAllFees, verifyFee, deleteReceiptImage };
