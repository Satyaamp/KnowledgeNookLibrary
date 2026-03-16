const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    libraryid: { type: String, default: "PENDING" },  // if add by admin then show otherwise pending 
    name: { type: String, required: true }, // FullName
    email: { type: String, required: true }, 
    otp: { type: String, required: true },
    createddatetime: { type: Date, default: Date.now },
    expiredatetime: { type: Date, required: true },
    countlimit: { type: Number, default: 1 } 
});

module.exports = mongoose.model('EmailOtp', otpSchema);