const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

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

// Fallback for SPA or unknown routes inside public
app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ message: 'Not Found' });
    }
});

module.exports = app;
