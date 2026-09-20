-- Development-only baseline: historical migrations 001–006 are absent from this repository.
-- Empty tables reconstructed from the current API queries; no production data is imported.
CREATE TABLE IF NOT EXISTS users (
 id INT AUTO_INCREMENT PRIMARY KEY, openId VARCHAR(190) UNIQUE NOT NULL,
 email VARCHAR(320) UNIQUE, password_hash VARCHAR(255), name VARCHAR(128),
 role VARCHAR(32) DEFAULT 'citizen', loginMethod VARCHAR(32), postalCode VARCHAR(12), city VARCHAR(128),
 theme_preference VARCHAR(10) DEFAULT 'auto', email_verified_at DATETIME,
 is_active BOOLEAN DEFAULT TRUE, merged_into_user_id INT, merged_at DATETIME,
 createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 lastSignedIn DATETIME
);
CREATE TABLE IF NOT EXISTS civic_wallets (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE,
 available_balance INT DEFAULT 0, total_earned INT DEFAULT 0, total_spent INT DEFAULT 0,
 trust_score INT DEFAULT 42, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS civic_transactions (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(32), amount INT,
 label VARCHAR(255), mission_id INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS missions (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, reward_amount INT,
 category VARCHAR(60), icon VARCHAR(80), validation_type VARCHAR(40), is_active BOOLEAN DEFAULT TRUE,
 max_completions INT, completions_count INT DEFAULT 0, postal_code VARCHAR(12)
);
CREATE TABLE IF NOT EXISTS mission_completions (
 id INT AUTO_INCREMENT PRIMARY KEY, mission_id INT NOT NULL, user_id INT NOT NULL,
 completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY (mission_id, user_id)
);
CREATE TABLE IF NOT EXISTS rewards (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, cost_credits INT,
 shop_id INT, postal_code VARCHAR(12), is_active BOOLEAN DEFAULT TRUE, image_url VARCHAR(1000)
);
CREATE TABLE IF NOT EXISTS shops (
 id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190), category VARCHAR(100), description TEXT,
 address VARCHAR(255), postalCode VARCHAR(12), city VARCHAR(120), phone VARCHAR(40), email VARCHAR(190),
 website VARCHAR(500), imageUrl VARCHAR(1000), rating DECIMAL(3,2) DEFAULT 0, reviewCount INT DEFAULT 0,
 hasPromotion BOOLEAN DEFAULT FALSE, promotionText VARCHAR(255), isActive BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS events (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(190), description TEXT, category VARCHAR(60),
 dateStart DATETIME, dateEnd DATETIME, timeLabel VARCHAR(80), location VARCHAR(190), address VARCHAR(255),
 postalCode VARCHAR(12), city VARCHAR(120), imageUrl VARCHAR(1000), isFree BOOLEAN DEFAULT TRUE,
 price DECIMAL(10,2) DEFAULT 0, organizer VARCHAR(190), organizerPhone VARCHAR(40), organizerEmail VARCHAR(190),
 status VARCHAR(32) DEFAULT 'pending', isRecurring BOOLEAN DEFAULT FALSE, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash CHAR(64) UNIQUE,
 user_agent TEXT, ip VARCHAR(64), expires_at DATETIME, revoked_at DATETIME, replaced_by_id INT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash CHAR(64) UNIQUE,
 expires_at DATETIME, used_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS password_reset_tokens LIKE email_verification_tokens;
CREATE TABLE IF NOT EXISTS user_devices (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, open_id VARCHAR(190) UNIQUE,
 platform VARCHAR(32), last_seen_at DATETIME
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id INT AUTO_INCREMENT PRIMARY KEY, actor_user_id INT, action VARCHAR(100), target_type VARCHAR(100),
 target_id VARCHAR(320), metadata JSON, ip VARCHAR(64), created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
