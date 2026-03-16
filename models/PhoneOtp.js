const mongoose = require('mongoose');

const phoneOtpSchema = new mongoose.Schema({
    libraryid: { type: String, required: true },
    name: { type: String, required: true },
    contact: { type: String, required: true },
    status: { type: String, enum: ['sent', 'verified'], default: 'sent' },
    createddatetime: { type: Date, default: Date.now },
    countlimit: { type: Number, default: 1 }
});

module.exports = mongoose.model('PhoneOtp', phoneOtpSchema);