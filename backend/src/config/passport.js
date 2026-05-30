const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt            = require('jsonwebtoken');
const db             = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId   = profile.id;
        const email      = profile.emails?.[0]?.value;
        const full_name  = profile.displayName;
        const avatar_url = profile.photos?.[0]?.value;

        if (!email) {
          return done(null, false, { message: 'Akun Google tidak memiliki email.' });
        }

        // 1. Cek apakah sudah ada akun dengan google_id ini
        const [byGoogle] = await db.query(
          'SELECT id, username, email, full_name, profile_pic_url, role_id FROM users WHERE google_id = ?',
          [googleId]
        );

        if (byGoogle.length > 0) {
          // Sudah pernah login Google → langsung return user
          return done(null, byGoogle[0]);
        }

        // 2. Cek apakah email sudah terdaftar (akun biasa)
        const [byEmail] = await db.query(
          'SELECT id, username, email, full_name, profile_pic_url, role_id FROM users WHERE email = ?',
          [email]
        );

        if (byEmail.length > 0) {
          // Akun email sudah ada → link google_id ke akun existing
          await db.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, byEmail[0].id]);
          return done(null, byEmail[0]);
        }

        // 3. User baru → buat akun baru
        // Generate username unik dari nama Google
        const baseUsername = full_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 30);

        let username = baseUsername;
        let suffix   = 1;
        while (true) {
          const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
          if (exists.length === 0) break;
          username = `${baseUsername}_${suffix++}`;
        }

        const [result] = await db.query(
          `INSERT INTO users (username, email, full_name, password_hash, google_id, profile_pic_url, email_verified, role_id)
           VALUES (?, ?, ?, 'GOOGLE_OAUTH_NO_PASSWORD', ?, ?, 1, 1)`,
          [username, email, full_name, googleId, avatar_url || null]
        );

        const newUser = {
          id:              result.insertId,
          username,
          email,
          full_name,
          profile_pic_url: avatar_url || null,
          role_id:         1,
        };

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
