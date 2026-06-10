const db = require('../config/db');
const { createNotification } = require('../utils/notifHelper');

// Helper: get full post with media, like status, repost info
const buildPostQuery = (extraWhere = '', params = [], viewerId = null) => {
  return db.query(
    `SELECT p.id, p.content, p.reply_count, p.repost_count, p.like_count, p.created_at,
            p.parent_post_id, p.repost_id,
            u.id AS user_id, u.username, u.full_name, u.profile_pic_url,
            IF(?, (SELECT COUNT(*) FROM likes WHERE user_id = ? AND post_id = p.id), 0) AS is_liked,
            IF(?, (SELECT COUNT(*) FROM posts WHERE user_id = ? AND repost_id = p.id), 0) AS is_reposted,
            rp.id AS rp_id, rp.content AS rp_content,
            ru.username AS rp_username, ru.full_name AS rp_full_name, ru.profile_pic_url AS rp_profile_pic
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN posts rp ON rp.id = p.repost_id
     LEFT JOIN users ru ON ru.id = rp.user_id
     ${extraWhere}
     ORDER BY p.created_at DESC LIMIT 30`,
    [viewerId ? 1 : 0, viewerId, viewerId ? 1 : 0, viewerId, ...params]
  );
};

const attachMedia = async (posts) => {
  if (posts.length === 0) return posts;
  const ids = posts.map(p => p.id);
  const [media] = await db.query(
    `SELECT post_id, media_url, sort_order FROM post_media WHERE post_id IN (?) ORDER BY sort_order`,
    [ids]
  );
  const mediaMap = {};
  media.forEach(m => {
    if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
    mediaMap[m.post_id].push(m.media_url);
  });
  return posts.map(p => ({ ...p, media: mediaMap[p.id] || [] }));
};

// GET /api/posts/feed
const getFeed = async (req, res) => {
  const viewerId = req.user.id;
  try {
    // For MVP / TikTok style, Feed shows ALL original posts globally (FYP style)
    // Exclude repost markers (p.repost_id IS NOT NULL) — those are NOT original posts
    const [posts] = await buildPostQuery(
      'WHERE p.parent_post_id IS NULL AND p.repost_id IS NULL',
      [],
      viewerId
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Post] getFeed error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/public  (for non-logged-in explore)
const getPublicFeed = async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT p.id, p.content, p.reply_count, p.repost_count, p.like_count, p.created_at,
              u.id AS user_id, u.username, u.full_name, u.profile_pic_url
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.parent_post_id IS NULL AND p.repost_id IS NULL
       ORDER BY p.created_at DESC LIMIT 30`
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/user/:username
const getUserPosts = async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user?.id || null;
  try {
    const [userRows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    const [posts] = await buildPostQuery('WHERE p.user_id = ? AND p.parent_post_id IS NULL AND p.repost_id IS NULL', [userRows[0].id], viewerId);
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/:id  - single post + replies
const getPost = async (req, res) => {
  const viewerId = req.user?.id || null;
  try {
    const [posts] = await buildPostQuery('WHERE p.id = ?', [req.params.id], viewerId);
    if (posts.length === 0) return res.status(404).json({ success: false, message: 'Post tidak ditemukan.' });
    const [replies] = await buildPostQuery('WHERE p.parent_post_id = ?', [req.params.id], viewerId);
    const withMedia = await attachMedia([...posts, ...replies]);
    return res.status(200).json({ success: true, data: { post: withMedia[0], replies: withMedia.slice(1) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/posts
const createPost = async (req, res) => {
  const { content, parent_post_id } = req.body;
  const userId = req.user.id;
  if (!content && (!req.files || req.files.length === 0))
    return res.status(400).json({ success: false, message: 'Post harus berisi teks atau gambar.' });
  if (content && content.length > 300)
    return res.status(400).json({ success: false, message: 'Konten maksimal 300 karakter.' });
  try {
    const [result] = await db.query(
      'INSERT INTO posts (user_id, content, parent_post_id) VALUES (?, ?, ?)',
      [userId, content || null, parent_post_id || null]
    );
    const postId = result.insertId;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const mediaValues = req.files.slice(0, 4).map((f, i) => [postId, `/uploads/posts/${f.filename}`, i]);
      await db.query('INSERT INTO post_media (post_id, media_url, sort_order) VALUES ?', [mediaValues]);
    }

    // If reply, increment parent reply_count
    if (parent_post_id) {
      await db.query('UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?', [parent_post_id]);
      // Trigger reply notification to the parent post owner
      const [parentRows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [parent_post_id]);
      if (parentRows.length > 0) {
        await createNotification(parentRows[0].user_id, userId, 'reply', postId);
      }
    }

    const [newPost] = await db.query(
      `SELECT p.*, u.username, u.full_name, u.profile_pic_url FROM posts p
       JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [postId]
    );
    return res.status(201).json({ success: true, message: 'Post berhasil dibuat.', data: newPost[0] });
  } catch (err) {
    console.error('[Post] createPost error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/posts/:id/like  — toggle like
const toggleLike = async (req, res) => {
  const userId = req.user.id;
  const postId = parseInt(req.params.id);
  try {
    const [exists] = await db.query('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    if (exists.length > 0) {
      await db.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      await db.query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [postId]);
      return res.status(200).json({ success: true, action: 'unliked' });
    } else {
      await db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      await db.query('UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
      // Trigger like notification to the post author
      const [postRows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (postRows.length > 0) {
        await createNotification(postRows[0].user_id, userId, 'like', postId);
      }
      return res.status(200).json({ success: true, action: 'liked' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/posts/:id/repost
const repost = async (req, res) => {
  const userId = req.user.id;
  const postId = parseInt(req.params.id);
  try {
    let targetPostId = postId;
    const [postRow] = await db.query('SELECT repost_id FROM posts WHERE id = ?', [postId]);
    if (postRow.length > 0 && postRow[0].repost_id) {
      targetPostId = postRow[0].repost_id;
    }

    const [already] = await db.query('SELECT id FROM posts WHERE user_id = ? AND repost_id = ?', [userId, targetPostId]);
    if (already.length > 0) {
      await db.query('DELETE FROM posts WHERE id = ?', [already[0].id]);
      await db.query('UPDATE posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = ?', [targetPostId]);
      return res.status(200).json({ success: true, action: 'un-reposted' });
    }
    await db.query('INSERT INTO posts (user_id, repost_id) VALUES (?, ?)', [userId, targetPostId]);
    await db.query('UPDATE posts SET repost_count = repost_count + 1 WHERE id = ?', [targetPostId]);
    // Trigger repost notification to the original post author
    const [targetRows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [targetPostId]);
    if (targetRows.length > 0) {
      await createNotification(targetRows[0].user_id, userId, 'repost', targetPostId);
    }
    return res.status(201).json({ success: true, action: 'reposted' });
  } catch (err) {
    console.error('[Post] repost error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/posts/:id/save  — toggle bookmark/save
const toggleSave = async (req, res) => {
  const userId = req.user.id;
  const postId = parseInt(req.params.id);
  try {
    const [exists] = await db.query('SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
    if (exists.length > 0) {
      await db.query('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
      return res.status(200).json({ success: true, data: { action: 'unsaved' } });
    } else {
      await db.query('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      return res.status(200).json({ success: true, data: { action: 'saved' } });
    }
  } catch (err) {
    console.error('[Post] toggleSave error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/saved  — get saved posts for current user
const getSavedPosts = async (req, res) => {
  const userId = req.user.id;
  try {
    const [posts] = await db.query(
      `SELECT p.id, p.content, p.reply_count, p.repost_count, p.like_count, p.created_at,
              p.parent_post_id, p.repost_id,
              u.id AS user_id, u.username, u.full_name, u.profile_pic_url,
              (SELECT COUNT(*) FROM likes WHERE user_id = ? AND post_id = p.id) AS is_liked,
              1 AS is_saved
       FROM saved_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN users u ON u.id = p.user_id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC LIMIT 50`,
      [userId, userId]
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Post] getSavedPosts error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/reposted/:userId  — get reposted posts for a user
const getRepostedPosts = async (req, res) => {
  const userId = parseInt(req.params.userId);
  const viewerId = req.user?.id || null;
  try {
    const [posts] = await db.query(
      `SELECT p.id, p.content, p.reply_count, p.repost_count, p.like_count, p.created_at,
              p.parent_post_id, p.repost_id,
              u.id AS user_id, u.username, u.full_name, u.profile_pic_url,
              IF(?, (SELECT COUNT(*) FROM likes WHERE user_id = ? AND post_id = p.id), 0) AS is_liked,
              1 AS is_reposted
       FROM posts rp_marker
       JOIN posts p ON p.id = rp_marker.repost_id
       JOIN users u ON u.id = p.user_id
       WHERE rp_marker.user_id = ? AND rp_marker.repost_id IS NOT NULL
       ORDER BY rp_marker.created_at DESC LIMIT 30`,
      [viewerId ? 1 : 0, viewerId, userId]
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Post] getRepostedPosts error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const deletePost = async (req, res) => {
  const userId = req.user.id;
  const postId = parseInt(req.params.id);
  try {
    const [postRows] = await db.query('SELECT user_id, parent_post_id, repost_id FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post tidak ditemukan.' });
    }
    const post = postRows[0];
    if (post.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk menghapus post ini.' });
    }

    if (post.parent_post_id) {
      await db.query('UPDATE posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = ?', [post.parent_post_id]);
    }
    if (post.repost_id) {
      await db.query('UPDATE posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = ?', [post.repost_id]);
    }

    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    return res.status(200).json({ success: true, message: 'Post berhasil dihapus.' });
  } catch (err) {
    console.error('[Post] deletePost error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/notes
const getNotesFeed = async (req, res) => {
  const viewerId = req.user.id;
  try {
    const [posts] = await buildPostQuery(
      'WHERE p.parent_post_id IS NULL AND p.repost_id IS NULL AND p.id NOT IN (SELECT DISTINCT post_id FROM post_media)',
      [],
      viewerId
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Post] getNotesFeed error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/posts/following
const getFollowingFeed = async (req, res) => {
  const viewerId = req.user.id;
  try {
    const [posts] = await buildPostQuery(
      'WHERE p.parent_post_id IS NULL AND p.repost_id IS NULL AND p.user_id IN (SELECT followed_id FROM follows WHERE follower_id = ?)',
      [viewerId],
      viewerId
    );
    const result = await attachMedia(posts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Post] getFollowingFeed error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getTrendingTags = async (req, res) => {
  try {
    const [posts] = await db.query(
      'SELECT content FROM posts WHERE content IS NOT NULL AND parent_post_id IS NULL AND repost_id IS NULL ORDER BY created_at DESC LIMIT 150'
    );

    const tagCounts = {};
    const tagRegex = /#(\w+)/g;

    posts.forEach(post => {
      const content = post.content;
      const matches = content.match(tagRegex);
      if (matches) {
        matches.forEach(m => {
          const tag = m.toLowerCase();
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.keys(tagCounts)
      .map(tag => ({ tag, count: tagCounts[tag] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.status(200).json({ success: true, data: sortedTags });
  } catch (err) {
    console.error('[Post] getTrendingTags error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getFeed, getPublicFeed, getNotesFeed, getFollowingFeed, getUserPosts, getPost, createPost, toggleLike, repost, toggleSave, getSavedPosts, getRepostedPosts, deletePost, getTrendingTags };



