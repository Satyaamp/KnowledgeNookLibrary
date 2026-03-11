const multer = require('multer');

// Configure Multer with memory storage
// We will upload directly to cloudinary using the buffer
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

module.exports = upload;
