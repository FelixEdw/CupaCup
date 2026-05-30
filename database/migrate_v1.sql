-- Migration: Add missing columns to existing matchup schema
-- Run this if you already have the old Database_Phase1.sql loaded
-- Safe to run multiple times (IF NOT EXISTS / IF COLUMN NOT EXISTS)

USE matchup;

-- ─── Roles table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (name) VALUES ('user'), ('moderator'), ('admin');

-- ─── Users: add missing columns ───────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_id          INT           NOT NULL DEFAULT 1 AFTER bio,
    ADD COLUMN IF NOT EXISTS email_verified   TINYINT(1)    DEFAULT 0 AFTER role_id,
    ADD COLUMN IF NOT EXISTS verify_token     VARCHAR(255)  DEFAULT NULL AFTER email_verified,
    ADD COLUMN IF NOT EXISTS cover_pic_url    VARCHAR(500)  DEFAULT NULL AFTER profile_pic_url,
    ADD COLUMN IF NOT EXISTS google_id        VARCHAR(255)  DEFAULT NULL AFTER cover_pic_url,
    ADD COLUMN IF NOT EXISTS is_active        TINYINT(1)    DEFAULT 1 AFTER google_id;

-- ─── Conversations table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    participant_1   INT NOT NULL COMMENT 'lower user_id',
    participant_2   INT NOT NULL COMMENT 'higher user_id',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_conversation (participant_1, participant_2),
    FOREIGN KEY (participant_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_2) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Messages: add missing columns ────────────────────────────────────────────
-- First add conversation_id if missing
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS conversation_id INT          DEFAULT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS content_enc     TEXT         DEFAULT NULL AFTER content,
    ADD COLUMN IF NOT EXISTS shared_post_id  INT          DEFAULT NULL AFTER media_url,
    ADD COLUMN IF NOT EXISTS message_type    VARCHAR(20)  DEFAULT 'text' AFTER shared_post_id;

-- ─── Posts: add counter columns ───────────────────────────────────────────────
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS reply_count  INT DEFAULT 0 AFTER repost_id,
    ADD COLUMN IF NOT EXISTS repost_count INT DEFAULT 0 AFTER reply_count,
    ADD COLUMN IF NOT EXISTS like_count   INT DEFAULT 0 AFTER repost_count;

-- ─── Post media: add sort_order & media_type ─────────────────────────────────
ALTER TABLE post_media
    ADD COLUMN IF NOT EXISTS media_type VARCHAR(20)  DEFAULT 'image' AFTER media_url,
    ADD COLUMN IF NOT EXISTS sort_order TINYINT      DEFAULT 0 AFTER media_type;

-- ─── Notifications table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    actor_id    INT          DEFAULT NULL,
    type        VARCHAR(50)  NOT NULL,
    entity_id   INT          DEFAULT NULL,
    is_read     TINYINT(1)   DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_username   ON users(username);
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversations(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user_id     ON notifications(user_id, is_read);

SELECT 'Migration completed successfully!' AS status;
