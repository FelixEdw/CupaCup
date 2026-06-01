const express = require('express');
const router  = express.Router();
const { createStory, getStoryFeed, viewStory, deleteStory } = require('../controllers/storyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { singleImage }  = require('../middlewares/uploadMiddleware');

router.get('/feed',      authenticate, getStoryFeed);
router.post('/',         authenticate, singleImage, createStory);
router.post('/:id/view', authenticate, viewStory);
router.delete('/:id',    authenticate, deleteStory);

module.exports = router;
