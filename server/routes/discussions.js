const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');

// Get all discussions
router.get('/', discussionController.getDiscussions);

module.exports = router;
