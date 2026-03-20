const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    StudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    LibraryID: { type: String },
    DateString: { type: String, required: true }, // Formatted like 'YYYY-MM-DD'
    CheckInTime: { type: Date },
    CheckOutTime: { type: Date },
    TotalHours: { type: Number, default: 0 },
    CheckOutMethod: { type: String, enum: ['Student', 'Admin', 'Auto'], default: 'Student' }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);