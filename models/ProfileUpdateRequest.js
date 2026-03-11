const mongoose = require('mongoose');

const profileUpdateRequestSchema = new mongoose.Schema({
    StudentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    ProposedData: {
        type: Object, // Stores key-value pairs of fields that student wants to update
        required: true,
    },
    Status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    }
}, { timestamps: true });

module.exports = mongoose.model('ProfileUpdateRequest', profileUpdateRequestSchema);
