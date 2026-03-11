const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Administrator = require('../models/Administrator');

const authGuard = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.role === 'admin') {
                req.user = await Administrator.findById(decoded.id).select('-Password');
                req.user.role = 'admin';
            } else if (decoded.role === 'student') {
                req.user = await Student.findById(decoded.id).select('-Password');
                req.user.role = 'student';
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { authGuard };
