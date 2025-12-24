const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const agoraController = require('../controllers/agoraController');

// GET /api/agora/rtc-token?channelName=...&callType=video|audio&expireSeconds=600&role=publisher
router.get('/rtc-token', auth, agoraController.getRtcToken);

module.exports = router;
