const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { getOrCreateConversation } = require('../controllers/chatController');

/**
 * Authenticate socket connection via JWT query param or header
 */
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
};

const registerChatSocket = (io) => {
  // Apply auth middleware to /chat namespace
  const chatNS = io.of('/chat');
  chatNS.use(authenticateSocket);

  chatNS.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] ✅ User ${user.username} (${user.id}) connected`);

    // Join personal room for DM delivery
    socket.join(`user:${user.id}`);

    /**
     * Join a conversation room
     * Client emits: { conversation_id }
     */
    socket.on('join_conversation', async ({ conversation_id }) => {
      try {
        // Verify participation
        const [conv] = await db.query(
          'SELECT id FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
          [conversation_id, user.id, user.id]
        );
        if (conv.length === 0) return;
        socket.join(`conv:${conversation_id}`);
        console.log(`[Socket] ${user.username} joined conv:${conversation_id}`);
      } catch (err) {
        console.error('[Socket] join_conversation error:', err);
      }
    });

    /**
     * Send message (real-time)
     * Client emits: { conversation_id, content, shared_post_id? }
     */
    socket.on('send_message', async ({ conversation_id, content, shared_post_id }) => {
      if (!content && !shared_post_id) return;

      try {
        const [conv] = await db.query(
          'SELECT id, participant_1, participant_2 FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
          [conversation_id, user.id, user.id]
        );
        if (conv.length === 0) return;

        const recipientId = conv[0].participant_1 === user.id ? conv[0].participant_2 : conv[0].participant_1;

        // Verify chat limit
        const { checkChatLimit } = require('../controllers/chatController');
        const canChat = await checkChatLimit(user.id, recipientId, conversation_id);
        if (!canChat) {
          socket.emit('error', { message: 'You can only send 1 message until they reply or follow you.' });
          return;
        }

        const msgType  = shared_post_id ? 'post_share' : 'text';
        const contentEnc = content ? encrypt(content) : null;

        const [result] = await db.query(
          `INSERT INTO messages (conversation_id, sender_id, receiver_id, content_enc, shared_post_id, message_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [conversation_id, user.id, recipientId, contentEnc, shared_post_id || null, msgType]
        );

        await db.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [conversation_id]);

        // Build payload for broadcast
        let sharedPost = null;
        if (shared_post_id) {
          const [sp] = await db.query(
            `SELECT p.id, p.content, u.username, u.profile_pic_url
             FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
            [shared_post_id]
          );
          sharedPost = sp[0] || null;
        }

        const payload = {
          id: result.insertId,
          conversation_id,
          sender_id: user.id,
          sender_username: user.username,
          content: content || null,
          shared_post_id: shared_post_id || null,
          shared_post: sharedPost,
          message_type: msgType,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        // Broadcast to conversation room
        chatNS.to(`conv:${conversation_id}`).emit('new_message', payload);

        // Also push to recipient's personal room (for notification if not in chat)
        chatNS.to(`user:${recipientId}`).emit('message_notification', {
          conversation_id,
          sender_username: user.username,
          preview: content ? content.slice(0, 50) : '📷 Image/Post',
        });

      } catch (err) {
        console.error('[Socket] send_message error:', err);
        socket.emit('error', { message: 'Failed to send message: ' + err.message });
      }
    });

    /**
     * Typing indicator
     * Client emits: { conversation_id }
     */
    socket.on('typing', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('user_typing', {
        conversation_id,
        user_id: user.id,
        username: user.username,
      });
    });

    socket.on('stop_typing', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('user_stop_typing', {
        conversation_id,
        user_id: user.id,
      });
    });

    /**
     * Mark messages as read
     * Client emits: { conversation_id }
     */
    socket.on('mark_read', async ({ conversation_id }) => {
      try {
        await db.query(
          'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?',
          [conversation_id, user.id]
        );
        // Notify sender their messages are read
        socket.to(`conv:${conversation_id}`).emit('messages_read', {
          conversation_id,
          read_by: user.id,
        });
      } catch (err) {
        console.error('[Socket] mark_read error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ❌ User ${user.username} disconnected`);
    });
  });
};

module.exports = registerChatSocket;
