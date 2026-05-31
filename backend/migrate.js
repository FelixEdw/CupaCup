/**
 * MatchUp Database Migration Script
 * Run: node migrate.js
 * Safe to run multiple times
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'matchup',
    multipleStatements: true,
  });

  console.log('🔗 Connected to MySQL...\n');

  const steps = [
    // Roles
    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
    `INSERT IGNORE INTO roles (name) VALUES ('user'), ('moderator'), ('admin')`,

    // Users — new columns
    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role_id        INT          NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS email_verified TINYINT(1)   DEFAULT 1,
      ADD COLUMN IF NOT EXISTS verify_token   VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS cover_pic_url  VARCHAR(500) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS google_id      VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS is_active      TINYINT(1)   DEFAULT 1`,

    // Posts — counter columns
    `ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS reply_count  INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS repost_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS like_count   INT DEFAULT 0`,

    // Post media — extra columns
    `ALTER TABLE post_media
      ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image',
      ADD COLUMN IF NOT EXISTS sort_order TINYINT     DEFAULT 0`,

    // Conversations
    `CREATE TABLE IF NOT EXISTS conversations (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      participant_1   INT NOT NULL,
      participant_2   INT NOT NULL,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_conversation (participant_1, participant_2),
      FOREIGN KEY (participant_1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_2) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    // Messages — new columns
    `ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS conversation_id INT         DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS content_enc     TEXT        DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS shared_post_id  INT         DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS message_type    VARCHAR(20) DEFAULT 'text'`,

    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT         NOT NULL,
      actor_id   INT         DEFAULT NULL,
      type       VARCHAR(50) NOT NULL,
      entity_id  INT         DEFAULT NULL,
      is_read    TINYINT(1)  DEFAULT 0,
      created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    // Saved posts (bookmarks)
    `CREATE TABLE IF NOT EXISTS saved_posts (
      user_id    INT NOT NULL,
      post_id    INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON posts(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_conv_participants  ON conversations(participant_1, participant_2)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conv_id   ON messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_user_id      ON notifications(user_id)`,
  ];

  for (let i = 0; i < steps.length; i++) {
    try {
      await conn.query(steps[i]);
      console.log(`✅ Step ${i + 1}/${steps.length} OK`);
    } catch (err) {
      // Ignore "Duplicate column" errors (already migrated)
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log(`⏭️  Step ${i + 1}/${steps.length} Skipped (already exists)`);
      } else {
        console.error(`❌ Step ${i + 1} FAILED:`, err.message);
      }
    }
  }

  await conn.end();
  console.log('\n🎉 Migration complete! Backend siap dipakai.\n');
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
