const express = require('express');
const router = express.Router();
const { uploadFee, getMyFees, getAllFees, verifyFee, deleteReceiptImage } = require('../controllers/feeController');
const { authGuard } = require('../middleware/authGuard');
const { adminGuard } = require('../middleware/adminGuard');
const upload = require('../utils/upload');

router.use(authGuard);

// Student routes
router.post('/upload', upload.single('receipt'), uploadFee);
router.get('/status', getMyFees);

// Admin routes
router.get('/', adminGuard, getAllFees);
router.put('/:id/verify', adminGuard, verifyFee);
router.delete('/:id/receipt', adminGuard, deleteReceiptImage);

module.exports = router;
