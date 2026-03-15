const multer = require('multer');

// Configure Multer with memory storage
// We will upload directly to cloudinary using the buffer
const storage = multer.memoryStorage();

const multerInstance = multer({
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

// Middleware wrapper to gracefully catch and return file upload errors
const handleUploadError = (multerMiddleware) => {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size is too large. Maximum limit is 1MB.' });
                }
                return res.status(400).json({ message: err.message });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    };
};

module.exports = {
    single: (name) => handleUploadError(multerInstance.single(name)),
    array: (name, maxCount) => handleUploadError(multerInstance.array(name, maxCount)),
    fields: (fields) => handleUploadError(multerInstance.fields(fields)),
    none: () => handleUploadError(multerInstance.none()),
    any: () => handleUploadError(multerInstance.any())
};
