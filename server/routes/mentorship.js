const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mentorshipController = require('../controllers/mentorshipController');

// @route   GET api/mentorship/mentors
// @desc    Get all mentors with filters
// @access  Private
router.get('/mentors', auth, mentorshipController.getMentors);

// @route   PUT api/mentorship/preferences
// @desc    Update mentorship preferences
// @access  Private
router.put('/preferences', auth, mentorshipController.updatePreferences);

// @route   POST api/mentorship/request/:mentorId
// @desc    Send mentorship request
// @access  Private
router.post('/request/:mentorId', auth, mentorshipController.sendRequest);

// @route   GET api/mentorship/requests
// @desc    Get all requests (incoming and outgoing)
// @access  Private
router.get('/requests', auth, mentorshipController.getRequests);

// @route   PUT api/mentorship/request/:requestId
// @desc    Update request status (accept/reject)
// @access  Private
router.put('/request/:requestId', auth, mentorshipController.updateRequestStatus);

module.exports = router;
