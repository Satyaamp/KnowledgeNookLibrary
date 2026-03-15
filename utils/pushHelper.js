const webpush = require('web-push');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

let isInitialized = false;

const initWebPush = () => {
    if (isInitialized) return true;
    
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn('VAPID keys missing in .env. Web Push Notifications are disabled.');
        return false;
    }

    // This identifies your server to the push services
    webpush.setVapidDetails(
        'mailto:knowledgenooklibrary@gmail.com',
        publicKey,
        privateKey
    );
    
    isInitialized = true;
    return true;
};

const sendPushToStudent = async (studentId, payload) => {
    if (!initWebPush()) return;

    try {
        const student = await Student.findById(studentId);
        if (!student || !student.pushSubscriptions || student.pushSubscriptions.length === 0) return;

        const invalidEndpoints = [];

        // Personalize the payload for the specific student
        const personalizedPayload = { ...payload };
        if (personalizedPayload.message) {
            personalizedPayload.message = personalizedPayload.message.replace(/\{FirstName\}/g, student.FirstName || 'Student');
        }
        if (personalizedPayload.title) {
            personalizedPayload.title = personalizedPayload.title.replace(/\{FirstName\}/g, student.FirstName || 'Student');
        }
        const payloadString = JSON.stringify(personalizedPayload);

        // Save notification to Database for proof/history
        try {
            await Notification.create({
                StudentId: student._id,
                LibraryID: student.LibraryID,
                StudentName: student.FullName || student.FirstName,
                Title: personalizedPayload.title || 'Notification',
                Message: personalizedPayload.message || 'You have a new message.',
                Url: personalizedPayload.url || '/student/dashboard.html#notifications'
            });
        } catch (dbErr) {
            console.error('Failed to save notification to DB:', dbErr);
        }

        // Send notification to all registered devices for this student
        for (const sub of student.pushSubscriptions) {
            try {
                await webpush.sendNotification(sub, payloadString);
            } catch (error) {
                // 410 Gone, 404 Not Found, or 400 Bad Request means the user uninstalled, revoked permissions, or has a broken browser endpoint (like Ulaa)
                if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 400) {
                    invalidEndpoints.push(sub.endpoint);
                } else {
                    console.error('Error sending push notification to student:', error);
                }
            }
        }

        // Cleanup dead subscriptions from the database automatically
        if (invalidEndpoints.length > 0) {
            student.pushSubscriptions = student.pushSubscriptions.filter(
                s => !invalidEndpoints.includes(s.endpoint)
            );
            await student.save();
        }
    } catch (error) {
        console.error('Database error while sending push notification:', error);
    }
};

const broadcastPush = async (payload) => {
    if (!initWebPush()) return;

    try {
        // Find all students who have at least one active subscription
        const students = await Student.find({ 'pushSubscriptions.0': { $exists: true } });
        
        for (const student of students) {
            await sendPushToStudent(student._id, payload);
        }
    } catch (error) {
        console.error('Error broadcasting push notification:', error);
    }
};

module.exports = { sendPushToStudent, broadcastPush };