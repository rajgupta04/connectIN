const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// @route   GET api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, notificationController.getNotifications);

// @route   PUT api/notifications/:id
// @desc    Mark notification as read
// @access  Private
router.put('/:id', auth, notificationController.markNotificationRead);

module.exports = router;
