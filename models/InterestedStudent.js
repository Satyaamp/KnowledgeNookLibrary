const mongoose = require('mongoose');

const interestedStudentSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: [true, 'Please add a name']
    },
    Contact: {
        type: String,
        required: [true, 'Please add a contact number']
    },
    Address: {
        type: String,
        required: [true, 'Please add an address']
    },
    PreferredBatch: {
        type: String,
        required: [true, 'Please specify a preferred batch']
    },
    Remarks: {
        type: String
    },
    Status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Rejected', 'ConvertedToStudent'],
        default: 'Pending'
    },
    SubmittedDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('InterestedStudent', interestedStudentSchema);
