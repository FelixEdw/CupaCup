const express = require('express');
const router  = express.Router();
const { getProfile, updateProfile, toggleFollow, searchUsers, getFollowers, getFollowing } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { singleImage }  = require('../middlewares/uploadMiddleware');

// Optional auth for public profile view
const optAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch { /* ignore invalid token */ }
  }
  next();
};

router.get('/search', optAuth, searchUsers);
router.get('/:username', optAuth, getProfile);
router.put('/me/profile', authenticate, singleImage, updateProfile);
router.post('/:id/follow', authenticate, toggleFollow);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
