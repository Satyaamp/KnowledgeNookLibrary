const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Otp = require('./models/EmailOtp');
const Student = require('./models/Student');

const app = express();

if (!process.env.GMAIL_PASS) {
    console.error('FATAL ERROR: GMAIL_PASS is not defined. Please check your .env file!');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cbse821@gmail.com',
        pass: process.env.GMAIL_PASS // Ensure no quotes around this
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route for health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Main routes mapping
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
// app.use('/api/profile-updates', require('./routes/profileUpdateRoutes'));

// --- OTP Verification Routes ---
app.post('/api/send-otp', async (req, res) => {
    const { libraryid, name, email } = req.body;

    // 1. Generate Prefix + 6 random digits
    const randomNumbers = Math.floor(100000 + Math.random() * 900000).toString();
    const generatedOtp = `KNL${randomNumbers}`; 
    
    // 2. Set Expiry (5 minutes)
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    try {
        // 3. Check daily limit (max 5 per email)
        const today = new Date().setHours(0,0,0,0);
        const dailyCount = await Otp.countDocuments({ 
            email, 
            createddatetime: { $gte: today } 
        });

        if (dailyCount >= 5) {
            return res.status(429).json({ message: "Daily limit reached. Try again tomorrow." });
        }

        // 4. Save to Database
        const newOtpEntry = new Otp({
            libraryid: libraryid || "PENDING",
            name,
            email,
            otp: generatedOtp,
            expiredatetime: expiry,
            countlimit: dailyCount + 1
        });
        await newOtpEntry.save();

        // 5. Send Professional HTML Email
        const info = await transporter.sendMail({
            from: '"Knowledge Nook Library" <cbse821@gmail.com>', 
            to: email,
            subject: `🔐 ${generatedOtp} is your Verification Code`, 
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1a73e8; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Knowledge Nook Library</h1>
                    </div>
                    <div style="padding: 30px; line-height: 1.6; color: #333;">
                        <p style="font-size: 18px;">Hello <strong>${name}</strong>,</p>
                        <p>Please use the verification code below to verify your email address:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; padding: 15px 30px; background-color: #f8f9fa; border: 2px dashed #1a73e8; border-radius: 5px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a73e8;">
                                ${generatedOtp}
                            </span>
                        </div>
                        <p style="font-size: 14px; color: #666;">Valid for 5 minutes. If you didn't request this, ignore this email.</p>
                    </div>
                    <div style="background-color: #f1f3f4; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                        © ${new Date().getFullYear()} Knowledge Nook Library
                    </div>
                </div>`
        });

        console.log(`[Email Sent] OTP ${generatedOtp} sent to ${email} (Message ID: ${info.messageId})`);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error('[Email Failed]', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Find latest OTP for this email
        const record = await Otp.findOne({ email }).sort({ createddatetime: -1 });

        if (!record) return res.status(404).json({ message: "No OTP found" });
        
        if (new Date() > record.expiredatetime) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (record.otp === otp) {
            // SUCCESS: Update the Student record
            await Student.findOneAndUpdate(
                { Email: email }, 
                { isEmailVerified: true }
            );
            
            res.status(200).json({ message: "Email verified successfully!" });
        } else {
            res.status(400).json({ message: "Invalid OTP" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fallback for SPA or unknown routes inside public
app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ message: 'Not Found' });
    }
});

module.exports = app;
