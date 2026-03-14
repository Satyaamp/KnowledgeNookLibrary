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
    AadharStatus: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
    AadharRejectionReason: { type: String },
    SeatNo: { type: String },
    planDuration: { type: String, enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'] },
    batchType: { type: String, enum: ['Basic', 'Fundamental', 'Standard', "Officer's"] },
    batchTiming: { type: String },
    amount: { type: Number },
    JoiningDate: { type: Date, default: Date.now },
    AccountStatus: { type: String, enum: ['Pending', 'Active', 'Inactive'], default: 'Active' },
    LibraryID: { type: String, unique: true, sparse: true } // Unique Admin-assigned ID
}, { timestamps: true });

// Pre-save hook to generate FullName and FullAddress
studentSchema.pre('save', function (next) {
    // Auto-format Names (Capitalize first letter of each word)
    if (this.FirstName) {
        this.FirstName = this.FirstName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    if (this.LastName) {
        this.LastName = this.LastName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    if (this.FatherName) {
        this.FatherName = this.FatherName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    this.FullName = this.LastName ? `${this.FirstName} ${this.LastName}` : this.FirstName;
    
    let addressParts = [];
    if (this.Area) addressParts.push(this.Area);
    if (this.City) addressParts.push(this.City);
    
    let address = addressParts.join(', ');
    if (this.Pincode) {
        address += address ? ` - ${this.Pincode}` : this.Pincode;
    }
    this.FullAddress = address || undefined;

    if (typeof next === 'function') {
        next();
    }
});

module.exports = mongoose.model('Student', studentSchema);
