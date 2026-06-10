const db = require('../config/db');
const { createNotification } = require('../utils/notifHelper');

const getProfile = async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user?.id || null;
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.profile_pic_url, u.cover_pic_url, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
              (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND parent_post_id IS NULL) AS posts_count,
              IF(?, (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = u.id), 0) AS is_following
       FROM users u WHERE u.username = ? AND u.is_active = 1`,
      [viewerId ? 1 : 0, viewerId, username]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[User] getProfile error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const updateProfile = async (req, res) => {
  const { full_name, bio } = req.body;
  const userId = req.user.id;
  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name.slice(0, 100);
  if (bio !== undefined) updates.bio = bio.slice(0, 160);
  if (req.file) updates.profile_pic_url = `/uploads/avatars/${req.file.filename}`;
  if (Object.keys(updates).length === 0)
    return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui.' });
  try {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(`UPDATE users SET ${fields} WHERE id = ?`, [...Object.values(updates), userId]);
    const [rows] = await db.query('SELECT id, username, email, full_name, bio, profile_pic_url FROM users WHERE id = ?', [userId]);
    return res.status(200).json({ success: true, message: 'Profil berhasil diperbarui.', data: rows[0] });
  } catch (err) {
    console.error('[User] updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const toggleFollow = async (req, res) => {
  const followerId = req.user.id;
  const followedId = parseInt(req.params.id);
  if (followerId === followedId) return res.status(400).json({ success: false, message: 'Tidak bisa follow diri sendiri.' });
  try {
    const [exists] = await db.query('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?', [followerId, followedId]);
    if (exists.length > 0) {
      await db.query('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?', [followerId, followedId]);
      return res.status(200).json({ success: true, data: { action: 'unfollowed' } });
    } else {
      await db.query('INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)', [followerId, followedId]);
      await createNotification(followedId, followerId, 'follow', followerId);
      return res.status(200).json({ success: true, data: { action: 'followed' } });
    }
  } catch (err) {
    console.error('[User] toggleFollow error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ success: false, message: 'Query wajib diisi.' });
  try {
    const [rows] = await db.query(
      `SELECT id, username, full_name, profile_pic_url FROM users
       WHERE (username LIKE ? OR full_name LIKE ?) AND is_active = 1 LIMIT 20`,
      [`%${q}%`, `%${q}%`]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[User] searchUsers error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getFollowers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.profile_pic_url
       FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.followed_id = ?`,
      [req.params.id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getFollowing = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.profile_pic_url
       FROM follows f JOIN users u ON u.id = f.followed_id WHERE f.follower_id = ?`,
      [req.params.id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getCreators = async (req, res) => {
  const viewerId = req.user?.id || null;
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.bio, u.profile_pic_url, u.cover_pic_url,
              (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND parent_post_id IS NULL) AS posts_count,
              IF(?, (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = u.id), 0) AS is_following
       FROM users u WHERE u.is_active = 1
       ORDER BY followers_count DESC LIMIT 30`,
      [viewerId ? 1 : 0, viewerId]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[User] getCreators error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT n.id, n.type, n.entity_id, n.is_read, n.created_at,
              u.username AS actor_username, u.full_name AS actor_full_name, u.profile_pic_url AS actor_profile_pic_url
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 30`,
      [userId]
    );
    // Mark notifications as read after fetching them
    if (rows.length > 0) {
      await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    }
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[User] getNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getProfile, updateProfile, toggleFollow, searchUsers, getFollowers, getFollowing, getCreators, getNotifications };
