const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    FirstName: { type: String, required: true },
    LastName: { type: String }, // Optional if name is single word
    FullName: { type: String },
    DOB: { type: Date },
    Gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    Email: { type: String, unique: true, sparse: true }, // Made optional, sparse allows multiple nulls
    Contact: { type: String, required: true, unique: true },
    Password: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },
    FatherName: { type: String },
    City: { type: String },
    Area: { type: String },
    Pincode: { type: String },
    FullAddress: { type: String },
    AadharNumber: { type: String },
    ProfilePictureURL: { type: String },
    AadharProofURL: { type: String },
    SeatNo: { type: String },
    CurrentBatch: { type: String },
    JoiningDate: { type: Date, default: Date.now },
    AccountStatus: { type: String, enum: ['Pending', 'Active', 'Suspended'], default: 'Active' },
    LibraryID: { type: String, unique: true, sparse: true } // Unique Admin-assigned ID
}, { timestamps: true });

// Pre-save hook to generate FullName and FullAddress
studentSchema.pre('save', function (next) {
    this.FullName = `${this.FirstName} ${this.LastName}`;
    this.FullAddress = `${this.Area}, ${this.City} - ${this.Pincode}`;
    if (typeof next === 'function') {
        next();
    }
});

module.exports = mongoose.model('Student', studentSchema);
