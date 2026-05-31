const db             = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');

// Helper: get or create conversation between two users
const getOrCreateConversation = async (userId1, userId2) => {
  const [p1, p2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
  const [existing] = await db.query(
    'SELECT id FROM conversations WHERE participant_1 = ? AND participant_2 = ?',
    [p1, p2]
  );
  if (existing.length > 0) return existing[0].id;
  const [result] = await db.query(
    'INSERT INTO conversations (participant_1, participant_2) VALUES (?, ?)',
    [p1, p2]
  );
  return result.insertId;
};

// Helper: Enforce 1x chat limit for non-mutual follows
const checkChatLimit = async (senderId, recipientId, convId) => {
  // 1. Check mutual follow
  const [mutual] = await db.query(
    `SELECT COUNT(*) as count 
     FROM follows f1 
     JOIN follows f2 ON f1.follower_id = f2.followed_id AND f1.followed_id = f2.follower_id
     WHERE f1.follower_id = ? AND f1.followed_id = ?`,
    [senderId, recipientId]
  );
  if (mutual[0].count > 0) return true; // Mutually following -> unlimited

  // 2. Check message history in this conversation
  const [history] = await db.query(
    'SELECT sender_id, COUNT(*) as msg_count FROM messages WHERE conversation_id = ? GROUP BY sender_id',
    [convId]
  );
  
  let senderCount = 0;
  let recipientCount = 0;
  history.forEach(row => {
    if (row.sender_id === senderId) senderCount = row.msg_count;
    if (row.sender_id === recipientId) recipientCount = row.msg_count;
  });

  // If recipient has replied, it is accepted -> unlimited
  if (recipientCount > 0) return true;

  // If sender already sent 1 or more messages and recipient hasn't replied -> Block
  if (senderCount >= 1) return false;

  return true; // Sender hasn't sent anything yet -> allowed 1x
};

// GET /api/conversations — List all DMs for current user
const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.last_message_at,
              IF(c.participant_1 = ?, c.participant_2, c.participant_1) AS other_user_id,
              u.username, u.full_name, u.profile_pic_url,
              (SELECT content_enc FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_msg_enc,
              (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_msg_type,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count
       FROM conversations c
       JOIN users u ON u.id = IF(c.participant_1 = ?, c.participant_2, c.participant_1)
       WHERE c.participant_1 = ? OR c.participant_2 = ?
       ORDER BY c.last_message_at DESC`,
      [userId, userId, userId, userId, userId]
    );

    const result = rows.map(row => ({
      ...row,
      last_message: row.last_msg_enc ? decrypt(row.last_msg_enc) : (row.last_msg_type === 'image' ? '📷 Gambar' : ''),
      last_msg_enc: undefined,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Chat] getConversations error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/conversations/:id/messages
const getMessages = async (req, res) => {
  const userId = req.user.id;
  const convId = parseInt(req.params.id);
  try {
    // Verify participant
    const [conv] = await db.query(
      'SELECT id FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
      [convId, userId, userId]
    );
    if (conv.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    const [msgs] = await db.query(
      `SELECT m.id, m.sender_id, m.content_enc, m.media_url, m.shared_post_id,
              m.message_type, m.is_read, m.created_at,
              u.username, u.full_name, u.profile_pic_url,
              p.content AS shared_post_content,
              pu.username AS shared_post_username,
              (SELECT media_url FROM post_media WHERE post_id = p.id ORDER BY sort_order ASC LIMIT 1) AS shared_post_media_url
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN posts p ON p.id = m.shared_post_id
       LEFT JOIN users pu ON pu.id = p.user_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC LIMIT 100`,
      [convId]
    );

    const result = msgs.map(m => ({
      ...m,
      content: m.content_enc ? decrypt(m.content_enc) : null,
      content_enc: undefined,
    }));

    // Mark as read
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?',
      [convId, userId]
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[Chat] getMessages error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/conversations — Start or get DM
const startConversation = async (req, res) => {
  const { recipient_id } = req.body;
  if (!recipient_id) return res.status(400).json({ success: false, message: 'recipient_id wajib diisi.' });
  try {
    const convId = await getOrCreateConversation(req.user.id, parseInt(recipient_id));
    const [conv] = await db.query(
      `SELECT c.id, u.id AS other_user_id, u.username, u.full_name, u.profile_pic_url
       FROM conversations c
       JOIN users u ON u.id = IF(c.participant_1 = ?, c.participant_2, c.participant_1)
       WHERE c.id = ?`,
      [req.user.id, convId]
    );
    return res.status(200).json({ success: true, data: conv[0] });
  } catch (err) {
    console.error('[Chat] startConversation error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/conversations/:id/messages — Send text/image/share via REST
const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const convId = parseInt(req.params.id);
  const { content, shared_post_id } = req.body;

  try {
    const [conv] = await db.query(
      'SELECT id, participant_1, participant_2 FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
      [convId, userId, userId]
    );
    if (conv.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    const recipientId = conv[0].participant_1 === userId ? conv[0].participant_2 : conv[0].participant_1;
    
    // Verify chat limit
    const canChat = await checkChatLimit(userId, recipientId, convId);
    if (!canChat) {
      return res.status(403).json({ success: false, message: 'Kamu hanya bisa mengirim 1 pesan sampai dia membalas atau mem-follow kamu.' });
    }

    let messageType = 'text';
    let mediaUrl    = null;
    let contentEnc  = content ? encrypt(content) : null;

    if (req.file) {
      mediaUrl    = `/uploads/chat/${req.file.filename}`;
      messageType = 'image';
    }
    if (shared_post_id) {
      messageType = 'post_share';
    }

    const [result] = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, content_enc, media_url, shared_post_id, message_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [convId, userId, recipientId, contentEnc, mediaUrl, shared_post_id || null, messageType]
    );

    await db.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [convId]);

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        conversation_id: convId,
        sender_id: userId,
        content: content || null,
        media_url: mediaUrl,
        shared_post_id: shared_post_id || null,
        message_type: messageType,
        is_read: false,
      },
    });
  } catch (err) {
    console.error('[Chat] sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const getConversationInfo = async (req, res) => {
  const userId = req.user.id;
  const convId = parseInt(req.params.id);
  try {
    const [conv] = await db.query(
      `SELECT c.id, u.id AS other_user_id, u.username, u.full_name, u.profile_pic_url
       FROM conversations c
       JOIN users u ON u.id = IF(c.participant_1 = ?, c.participant_2, c.participant_1)
       WHERE c.id = ? AND (c.participant_1 = ? OR c.participant_2 = ?)`,
      [userId, convId, userId, userId]
    );
    if (conv.length === 0) {
      return res.status(404).json({ success: false, message: 'Percakapan tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, data: conv[0] });
  } catch (err) {
    console.error('[Chat] getConversationInfo error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getConversations, getMessages, startConversation, sendMessage, getOrCreateConversation, checkChatLimit, getConversationInfo };
