const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const connectionController = require('../controllers/connectionController');

// @route   POST api/connections/request/:id
// @desc    Send connection request
// @access  Private
router.post('/request/:id', auth, connectionController.sendConnectionRequest);

// @route   PUT api/connections/accept/:id
// @desc    Accept connection request
// @access  Private
router.put('/accept/:id', auth, connectionController.acceptConnectionRequest);

// @route   GET api/connections/requests
// @desc    Get pending connection requests
// @access  Private
router.get('/requests', auth, connectionController.getConnectionRequests);

// @route   GET api/connections
// @desc    Get all connections for current user
// @access  Private
router.get('/', auth, connectionController.getConnections);

module.exports = router;
