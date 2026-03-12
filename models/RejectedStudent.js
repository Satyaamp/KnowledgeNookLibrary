const mongoose = require('mongoose');

const rejectedStudentSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Contact: {
        type: String,
        required: true
    },
    
    Reason: {
        type: String,
        required: true
    },
    RejectedDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RejectedStudent', rejectedStudentSchema);
