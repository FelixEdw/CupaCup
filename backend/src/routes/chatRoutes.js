const express = require('express');
const router  = express.Router();
const { getConversations, getMessages, startConversation, sendMessage } = require('../controllers/chatController');
const { authenticate } = require('../middlewares/authMiddleware');
const { singleImage }  = require('../middlewares/uploadMiddleware');

router.get('/',              authenticate, getConversations);
router.post('/',             authenticate, startConversation);
router.get('/:id/messages',  authenticate, getMessages);
router.post('/:id/messages', authenticate, singleImage, sendMessage);

module.exports = router;
