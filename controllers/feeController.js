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

        // Calculate Covered Months based on plan
        let monthInc = 1;
        if (student.planDuration === 'Quarterly') monthInc = 3;
        else if (student.planDuration === 'Half-Yearly') monthInc = 6;
        else if (student.planDuration === 'Yearly') monthInc = 12;

        const coveredMonths = [];
        const baseDate = new Date(formattedMonth);
        if (!isNaN(baseDate.getTime())) {
            for (let i = 0; i < monthInc; i++) {
                const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
                coveredMonths.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            }
        } else {
            coveredMonths.push(formattedMonth);
        }

        // Create regex array for case-insensitive Month match
        const regexMonths = coveredMonths.map(m => new RegExp(`^${escapeRegExp(m)}$`, 'i'));

        // Check if ANY fee already exists covering ANY of the months in this new upload
        let fee = await Fee.findOne({
            StudentId: req.user.id,
            $or: [
                { Month: { $in: regexMonths } },
                { CoveredMonths: { $in: coveredMonths } } // Protects against overlapping plan payments
            ]
        });

        if (fee) {
            // Prevent re-uploading if it's already Paid or Pending
            if (fee.Status === 'Paid' || fee.Status === 'Approved') {
                return res.status(400).json({ message: `Conflict: A fee covering part or all of these months (${fee.Month}) is already marked as Paid.` });
            }
            if (fee.Status === 'Pending') {
                return res.status(400).json({ message: `Conflict: A receipt covering part or all of these months (${fee.Month}) is already under review.` });
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
            fee.CoveredMonths = coveredMonths;
            await fee.save();
        } else {
            // Create a brand new record if none exists
            fee = await Fee.create({
                StudentId: req.user.id,
                LibraryID: student ? student.LibraryID : undefined,
                Month: formattedMonth,
                Amount,
                Batch,
                CoveredMonths: coveredMonths,
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
                // Check for uniqueness before saving the manual input
                const existing = await Fee.findOne({ ReceiptNo: req.body.ReceiptNo, _id: { $ne: fee._id } });
                if (existing) {
                    return res.status(400).json({ message: `Receipt No '${req.body.ReceiptNo}' is already in use. Please enter a unique number.` });
                }
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


// @desc    Track receipt download
// @route   POST /api/fees/:id/track-download
// @access  Private (Student & Admin)
const trackDownload = async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });

        fee.downloadHistory = fee.downloadHistory || [];
        fee.downloadHistory.push({
            downloadedAt: new Date(),
            downloadedByRole: req.user.role || 'unknown'
        });
        
        await fee.save({ validateBeforeSave: false });
        res.json({ message: 'Download tracked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error tracking download', error: error.message });
    }
};



module.exports = { uploadFee, getMyFees, getAllFees, verifyFee, deleteReceiptImage, trackDownload };
