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
    planDuration: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
        required: [true, 'Please specify plan duration']
    },
    batchType: {
        type: String,
        enum: ['Basic', 'Fundamental', 'Standard', "Officer's"],
        required: [true, 'Please specify batch type']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
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
