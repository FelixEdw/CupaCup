const db = require('../config/db');

const createNotification = async (userId, actorId, type, entityId) => {
  if (!userId || !actorId || userId === actorId) return;
  try {
    // Avoid double notifications for same action within 1 hour
    const [exists] = await db.query(
      `SELECT 1 FROM notifications 
       WHERE user_id = ? AND actor_id = ? AND type = ? AND entity_id = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [userId, actorId, type, entityId]
    );
    if (exists.length > 0) return;

    await db.query(
      'INSERT INTO notifications (user_id, actor_id, type, entity_id) VALUES (?, ?, ?, ?)',
      [userId, actorId, type, entityId]
    );
  } catch (err) {
    console.error('[Notification Helper] create error:', err);
  }
};

module.exports = { createNotification };
