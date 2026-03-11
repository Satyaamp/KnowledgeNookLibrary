const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const administratorSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
    },
    Email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    Password: {
        type: String,
        required: true,
    }
}, { timestamps: true });

// Pre-save middleware to hash password
administratorSchema.pre('save', async function () {
    if (!this.isModified('Password')) return;
    const salt = await bcrypt.genSalt(10);
    this.Password = await bcrypt.hash(this.Password, salt);
});

// Method to compare password
administratorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.Password);
};

module.exports = mongoose.model('Administrator', administratorSchema);
