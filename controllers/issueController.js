const Issue = require('../models/Issue');
const Student = require('../models/Student');
const DeletedIssue = require('../models/DeletedIssue');

// @desc    Create an issue
// @route   POST /api/issues/create
// @access  Private/Student
const createIssue = async (req, res) => {
    try {
        const { IssueTitle, Description } = req.body;

        const student = await Student.findById(req.user.id);

        if (student.AccountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
        }

        const issue = await Issue.create({
            StudentId: req.user.id,
            LibraryID: student ? student.LibraryID : undefined,
            IssueTitle,
            Description
        });

        res.status(201).json(issue);
    } catch (error) {
        res.status(500).json({ message: 'Error creating issue', error: error.message });
    }
};

// @desc    Get my issues
// @route   GET /api/issues/my
// @access  Private/Student
const getMyIssues = async (req, res) => {
    try {
        const issues = await Issue.find({ StudentId: req.user.id }).sort({ createdAt: -1 });
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching issues', error: error.message });
    }
};

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private/Admin
const getAllIssues = async (req, res) => {
    try {
        const issues = await Issue.find({}).sort({ createdAt: -1 }).populate('StudentId', 'LibraryID FullName SeatNo Contact');
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all issues', error: error.message });
    }
};

// @desc    Update issue status
// @route   PUT /api/issues/:id
// @access  Private/Admin
const updateIssueStatus = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id);

        if (issue) {
            issue.Status = req.body.Status || issue.Status;
            if (req.body.AdminResponse !== undefined) {
                issue.AdminResponse = req.body.AdminResponse;
            }
            const updatedIssue = await issue.save();
            res.json(updatedIssue);
        } else {
            res.status(404).json({ message: 'Issue not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating issue', error: error.message });
    }
};

// @desc    Delete and archive an issue
// @route   DELETE /api/issues/:id
// @access  Private (Student & Admin)
const deleteIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id).populate('StudentId');

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        // Check if user is admin or the student who created it
        if (req.user.role !== 'admin' && req.user.id !== issue.StudentId._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this issue' });
        }

        if (req.user.role === 'student') {
            const student = await Student.findById(req.user.id);
            if (student && student.AccountStatus === 'Inactive') {
                return res.status(403).json({ message: 'Account is inactive. You cannot perform this action.' });
            }
        }

        if (issue.Status !== 'Resolved') {
            return res.status(400).json({ message: 'Only resolved issues can be deleted' });
        }

        // Create archive record
        await DeletedIssue.create({
            StudentName: issue.StudentId ? issue.StudentId.FullName : 'Unknown',
            StudentContact: issue.StudentId ? issue.StudentId.Contact : 'Unknown',
            LibraryID: issue.StudentId ? issue.StudentId.LibraryID : undefined,
            IssueTitle: issue.IssueTitle,
            Message: issue.Description,
            Status: issue.Status,
            AdminResponse: issue.AdminResponse,
            OriginalCreatedAt: issue.createdAt,
            DeletedByRole: req.user.role // 'student' or 'admin'
        });

        // Use deleteOne instead of remove
        await Issue.deleteOne({ _id: issue._id });

        res.json({ message: 'Issue deleted and archived successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting issue', error: error.message });
    }
};

module.exports = { createIssue, getMyIssues, getAllIssues, updateIssueStatus, deleteIssue };
