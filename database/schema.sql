-- ===========================================
--  SuperApp MVP — Complete Database Schema
--  Version: 1.0 | Phase: Social + Chat
--  Author: Felix Edward
--  Next Phase: Dating App (dating_profiles, swipes, matches)
-- ===========================================

CREATE DATABASE IF NOT EXISTS matchup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE matchup;

-- ===========================================
-- RBAC: Roles & Permissions
-- ===========================================
CREATE TABLE IF NOT EXISTS roles (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g. user, moderator, admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (name) VALUES ('user'), ('moderator'), ('admin');

-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50)  UNIQUE NOT NULL,
    email            VARCHAR(100) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(100),
    bio              VARCHAR(160)  DEFAULT NULL COMMENT 'Max 160 chars like X',
    profile_pic_url  VARCHAR(500)  DEFAULT NULL,
    cover_pic_url    VARCHAR(500)  DEFAULT NULL,
    role_id          INT           NOT NULL DEFAULT 1 COMMENT 'FK to roles.id',
    email_verified   TINYINT(1)    DEFAULT 0,
    verify_token     VARCHAR(255)  DEFAULT NULL,
    google_id        VARCHAR(255)  DEFAULT NULL UNIQUE COMMENT 'For Google OAuth later',
    is_active        TINYINT(1)    DEFAULT 1,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===========================================
-- FOLLOWS (Many-to-Many)
-- ===========================================
CREATE TABLE IF NOT EXISTS follows (
    follower_id  INT NOT NULL,
    followed_id  INT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===========================================
-- POSTS (Post, Reply, Repost in one table)
-- ===========================================
CREATE TABLE IF NOT EXISTS posts (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT          NOT NULL,
    content        VARCHAR(300) DEFAULT NULL COMMENT 'Max 300 chars per PRD',
    parent_post_id INT          DEFAULT NULL COMMENT 'Set when this is a reply',
    repost_id      INT          DEFAULT NULL COMMENT 'Set when this is a repost',
    reply_count    INT          DEFAULT 0,
    repost_count   INT          DEFAULT 0,
    like_count     INT          DEFAULT 0,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (repost_id)      REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ===========================================
-- POST MEDIA (Max 4 images per post)
-- ===========================================
CREATE TABLE IF NOT EXISTS post_media (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT          NOT NULL,
    media_url  VARCHAR(500) NOT NULL,
    media_type VARCHAR(20)  DEFAULT 'image' COMMENT 'image | video future',
    sort_order TINYINT      DEFAULT 0 COMMENT '0-3, display order',
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===========================================
-- LIKES
-- ===========================================
CREATE TABLE IF NOT EXISTS likes (
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===========================================
-- CONVERSATIONS (1-on-1 DM rooms)
-- ===========================================
CREATE TABLE IF NOT EXISTS conversations (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    participant_1 INT NOT NULL COMMENT 'Always store lower user_id here',
    participant_2 INT NOT NULL COMMENT 'Always store higher user_id here',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_conversation (participant_1, participant_2),
    FOREIGN KEY (participant_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_2) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversations(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg     ON conversations(last_message_at DESC);

-- ===========================================
-- MESSAGES (AES-encrypted content)
-- ===========================================
CREATE TABLE IF NOT EXISTS messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT          NOT NULL,
    sender_id       INT          NOT NULL,
    content_enc     TEXT         DEFAULT NULL  COMMENT 'AES-encrypted message text',
    media_url       VARCHAR(500) DEFAULT NULL  COMMENT 'Image/media URL if sent',
    shared_post_id  INT          DEFAULT NULL  COMMENT 'For Share-to-DM feature',
    message_type    VARCHAR(20)  DEFAULT 'text' COMMENT 'text | image | post_share',
    is_read         TINYINT(1)   DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (shared_post_id)  REFERENCES posts(id)         ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_messages_conv_id  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);

-- ===========================================
-- NOTIFICATIONS (for future use)
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL COMMENT 'Recipient',
    actor_id    INT          DEFAULT NULL COMMENT 'Who triggered it',
    type        VARCHAR(50)  NOT NULL COMMENT 'like | reply | follow | repost | dm',
    entity_id   INT          DEFAULT NULL COMMENT 'post_id or conversation_id',
    is_read     TINYINT(1)   DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id, is_read);

-- ===========================================
-- SEED DATA — Default admin account
-- Password: Admin@1234 (bcrypt hashed)
-- ===========================================
INSERT IGNORE INTO users (username, email, password_hash, full_name, role_id, email_verified)
VALUES (
    'admin',
    'admin@matchup.app',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGX5sQPVMtZbVaI.sxIJ5lWj6K6',
    'MatchUp Admin',
    3,
    1
);

-- ===========================================
-- PHASE 2 PLACEHOLDER: Dating App Tables
-- (Uncomment when building dating features)
-- ===========================================
/*
CREATE TABLE IF NOT EXISTS dating_profiles (
    user_id        INT          PRIMARY KEY,
    gender         VARCHAR(20)  DEFAULT NULL,
    interested_in  VARCHAR(50)  DEFAULT NULL,
    date_of_birth  DATE         DEFAULT NULL,
    location_city  VARCHAR(100) DEFAULT NULL,
    is_visible     TINYINT(1)   DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS swipes (
    swiper_id    INT NOT NULL,
    swiped_id    INT NOT NULL,
    direction    ENUM('like','pass','super_like') NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (swiper_id, swiped_id),
    FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (swiped_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS matches (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_1       INT NOT NULL,
    user_2       INT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_match (user_1, user_2),
    FOREIGN KEY (user_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_2) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
*/
