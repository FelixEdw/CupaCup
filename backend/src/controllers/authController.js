const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, dan password wajib diisi.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
  }

  if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Username hanya boleh huruf, angka, dan underscore (3-50 karakter).' });
  }

  try {
    // Check duplicate
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email atau username sudah digunakan.' });
    }

    const password_hash  = await bcrypt.hash(password, SALT_ROUNDS);
    const verify_token   = uuidv4();

    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, verify_token, email_verified, role_id)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [username, email, password_hash, full_name || username, verify_token]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { id: userId, username, email, role_id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil!',
      data: {
        token,
        user: { id: userId, username, email, full_name: full_name || username, role_id: 1 },
      },
    });
  } catch (err) {
    console.error('[Auth] register error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, username, email, password_hash, full_name, profile_pic_url, bio, role_id FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const user    = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash: _, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      data: { token, user: safeUser },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.bio, u.profile_pic_url, u.cover_pic_url,
              u.role_id, u.email_verified, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
       FROM users u WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { register, login, getMe };
