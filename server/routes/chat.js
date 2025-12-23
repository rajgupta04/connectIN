const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.post('/', auth, chatController.sendMessage);
router.get('/conversations', auth, chatController.getConversations);
router.get('/:userId', auth, chatController.getMessages);

module.exports = router;
