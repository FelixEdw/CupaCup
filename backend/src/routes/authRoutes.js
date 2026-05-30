const express = require('express');
const router  = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);

// ─── Google OAuth Routes ──────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=GoogleAuthFailed` }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username, email: req.user.email, role_id: req.user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Convert user object to base64 JSON string to pass securely via URL
    const userStr = Buffer.from(JSON.stringify(req.user)).toString('base64');
    
    // Redirect back to frontend with token and user data
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}&user=${userStr}`);
  }
);

module.exports = router;
