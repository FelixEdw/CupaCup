const express = require('express');
const router  = express.Router();
const { getFeed, getPublicFeed, getNotesFeed, getFollowingFeed, getUserPosts, getPost, createPost, toggleLike, repost, toggleSave, getSavedPosts, getRepostedPosts, deletePost } = require('../controllers/postController');
const { authenticate } = require('../middlewares/authMiddleware');
const { postImages }   = require('../middlewares/uploadMiddleware');

const optAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    try { req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET); } catch {}
  }
  next();
};

router.get('/feed',              authenticate, getFeed);
router.get('/public',            getPublicFeed);
router.get('/notes',             authenticate, getNotesFeed);
router.get('/following',         authenticate, getFollowingFeed);
router.get('/saved',             authenticate, getSavedPosts);
router.get('/user/:username',    optAuth, getUserPosts);
router.get('/reposted/:userId',  optAuth, getRepostedPosts);
router.get('/:id',               optAuth, getPost);
router.post('/',                 authenticate, postImages, createPost);
router.post('/:id/like',         authenticate, toggleLike);
router.post('/:id/repost',       authenticate, repost);
router.post('/:id/save',         authenticate, toggleSave);
router.delete('/:id',            authenticate, deletePost);

module.exports = router;


