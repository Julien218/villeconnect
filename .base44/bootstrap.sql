-- DEV ONLY: minimum legacy schema inferred from the checked-in queries.
-- The original migrations 001-006 are absent. Never apply this to production.
-- No production data or fabricated business records are inserted.
CREATE TABLE IF NOT EXISTS users (
 id INT AUTO_INCREMENT PRIMARY KEY, openId VARCHAR(190) NOT NULL UNIQUE,
 email VARCHAR(320) UNIQUE, password_hash VARCHAR(255), name VARCHAR(128),
 role VARCHAR(32) NOT NULL DEFAULT 'citizen', loginMethod VARCHAR(32) DEFAULT 'anonymous',
 postalCode VARCHAR(12), city VARCHAR(128), theme_preference VARCHAR(16) DEFAULT 'auto',
 is_active TINYINT NOT NULL DEFAULT 1, email_verified_at DATETIME, merged_into_user_id INT,
 lastSignedIn DATETIME, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
 updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
 user_agent TEXT, ip VARCHAR(64), expires_at DATETIME NOT NULL, revoked_at DATETIME,
 replaced_by_id INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME NOT NULL, used_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS password_reset_tokens LIKE email_verification_tokens;
CREATE TABLE IF NOT EXISTS user_devices (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, open_id VARCHAR(190) NOT NULL UNIQUE,
 platform VARCHAR(32), last_seen_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, actor_user_id INT, action VARCHAR(128), target_type VARCHAR(64),
 target_id VARCHAR(320), metadata JSON, ip VARCHAR(64), created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS civic_wallets (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, available_balance INT DEFAULT 0,
 total_earned INT DEFAULT 0, total_spent INT DEFAULT 0, trust_score INT DEFAULT 42,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS civic_transactions (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(32), amount INT,
 label VARCHAR(500), mission_id INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS missions (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, reward_amount INT,
 category VARCHAR(64), icon VARCHAR(64), validation_type VARCHAR(32), is_active TINYINT DEFAULT 1,
 max_completions INT, completions_count INT DEFAULT 0, postal_code VARCHAR(12)
);
CREATE TABLE IF NOT EXISTS mission_completions (
 id INT AUTO_INCREMENT PRIMARY KEY, mission_id INT NOT NULL, user_id INT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY (mission_id,user_id)
);
CREATE TABLE IF NOT EXISTS rewards (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, cost_credits INT,
 shop_id INT, postal_code VARCHAR(12), is_active TINYINT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS shops (
 id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190), category VARCHAR(100), description TEXT,
 address VARCHAR(255), postalCode VARCHAR(12), city VARCHAR(120), phone VARCHAR(40), email VARCHAR(190),
 website VARCHAR(500), imageUrl VARCHAR(1000), rating DECIMAL(3,2) DEFAULT 0,
 reviewCount INT DEFAULT 0, hasPromotion TINYINT DEFAULT 0, promotionText VARCHAR(255), isActive TINYINT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS events (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, category VARCHAR(60),
 dateStart DATETIME, dateEnd DATETIME, timeLabel VARCHAR(100), location VARCHAR(190), address VARCHAR(255),
 postalCode VARCHAR(12), city VARCHAR(120), imageUrl VARCHAR(1000), isFree TINYINT DEFAULT 1,
 price DECIMAL(10,2) DEFAULT 0, organizer VARCHAR(190), organizerPhone VARCHAR(40), organizerEmail VARCHAR(190),
 status VARCHAR(32) DEFAULT 'pending', isRecurring TINYINT DEFAULT 0, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS communal_alerts (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), message TEXT, type VARCHAR(32), postalCode VARCHAR(12),
 city VARCHAR(120), startDate DATETIME, endDate DATETIME, expiresAt DATETIME, isActive TINYINT DEFAULT 1,
 createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS waitlist (
 id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, postal_code VARCHAR(12),
 city VARCHAR(128), role VARCHAR(32), source VARCHAR(64), confirmed TINYINT DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
