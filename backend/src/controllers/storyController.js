const db = require('../config/db');
const path = require('path');

// POST /api/stories — Create a new story
const createStory = async (req, res) => {
  const userId = req.user.id;
  const { content } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File media wajib diunggah.' });
  }

  const mediaUrl = `/uploads/stories/${req.file.filename}`;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const isVideo = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.3gp'].includes(ext);
  const mediaType = isVideo ? 'video' : 'image';

  try {
    const [result] = await db.query(
      'INSERT INTO stories (user_id, media_url, media_type, content) VALUES (?, ?, ?, ?)',
      [userId, mediaUrl, mediaType, content || null]
    );
    
    return res.status(201).json({
      success: true,
      message: 'Story berhasil dibuat.',
      data: {
        id: result.insertId,
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        content: content || null,
        created_at: new Date(),
      }
    });
  } catch (err) {
    console.error('[Story] createStory error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/stories/feed — Fetch active stories (<24 hours) from followed users + ourselves
const getStoryFeed = async (req, res) => {
  const userId = req.user.id;
  try {
    // Select active stories from followed users and self
    const [rows] = await db.query(
      `SELECT s.id, s.user_id, s.media_url, s.media_type, s.content, s.created_at,
              u.username, u.full_name, u.profile_pic_url,
              IF((SELECT COUNT(*) FROM story_views WHERE story_id = s.id AND viewer_id = ?), 1, 0) AS is_viewed
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.created_at >= NOW() - INTERVAL 1 DAY
         AND (s.user_id = ? OR s.user_id IN (SELECT followed_id FROM follows WHERE follower_id = ?))
       ORDER BY s.created_at ASC`,
      [userId, userId, userId]
    );

    // Group stories by user
    const storyFeed = [];
    const userGroups = {};

    rows.forEach(row => {
      const uId = row.user_id;
      if (!userGroups[uId]) {
        userGroups[uId] = {
          user_id: row.user_id,
          username: row.username,
          full_name: row.full_name,
          profile_pic_url: row.profile_pic_url,
          stories: [],
        };
        storyFeed.push(userGroups[uId]);
      }
      userGroups[uId].stories.push({
        id: row.id,
        media_url: row.media_url,
        media_type: row.media_type,
        content: row.content,
        created_at: row.created_at,
        is_viewed: Boolean(row.is_viewed),
      });
    });

    return res.status(200).json({ success: true, data: storyFeed });
  } catch (err) {
    console.error('[Story] getStoryFeed error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/stories/:id/view — Mark a story as viewed
const viewStory = async (req, res) => {
  const viewerId = req.user.id;
  const storyId = parseInt(req.params.id);
  try {
    await db.query(
      'INSERT IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)',
      [storyId, viewerId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Story] viewStory error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const deleteStory = async (req, res) => {
  const userId = req.user.id;
  const storyId = parseInt(req.params.id);
  try {
    const [storyRows] = await db.query('SELECT user_id FROM stories WHERE id = ?', [storyId]);
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story tidak ditemukan.' });
    }
    if (storyRows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk menghapus story ini.' });
    }
    await db.query('DELETE FROM stories WHERE id = ?', [storyId]);
    return res.status(200).json({ success: true, message: 'Story berhasil dihapus.' });
  } catch (err) {
    console.error('[Story] deleteStory error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = {
  createStory,
  getStoryFeed,
  viewStory,
  deleteStory,
};
