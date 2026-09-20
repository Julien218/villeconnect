-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 000 : Schéma de base (reconstitué pour dev Base44)
-- Crée les tables fondamentales (users, shops, wallet, missions, events, etc.)
-- qui sont référencées par le code mais dont les migrations 001-006 originales
-- ne sont pas incluses dans ce dépôt.

-- ─── USERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  openId              VARCHAR(190) NOT NULL UNIQUE,
  email               VARCHAR(320) NULL UNIQUE,
  password_hash       VARCHAR(255) NULL,
  name                VARCHAR(128) NULL,
  role                ENUM('citizen','merchant','city_admin','admin','super_admin') NOT NULL DEFAULT 'citizen',
  loginMethod         ENUM('anonymous','password') NOT NULL DEFAULT 'anonymous',
  postalCode          VARCHAR(4) NULL,
  city                VARCHAR(128) NULL,
  theme_preference    ENUM('light','dark','auto') NOT NULL DEFAULT 'auto',
  email_verified_at   DATETIME NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  merged_into_user_id INT NULL,
  lastSignedIn        DATETIME NULL,
  createdAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_openId (openId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SHOPS (legacy — toujours lu par shopsRouter et migration 011) ─────────
CREATE TABLE IF NOT EXISTS shops (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(190) NOT NULL,
  category       VARCHAR(100) NOT NULL DEFAULT 'Commerce',
  description    TEXT NULL,
  address        VARCHAR(255) NOT NULL DEFAULT '',
  postalCode     VARCHAR(12) NOT NULL DEFAULT '',
  city           VARCHAR(120) NOT NULL DEFAULT '',
  phone          VARCHAR(40) NULL,
  email          VARCHAR(190) NULL,
  website        VARCHAR(500) NULL,
  imageUrl       VARCHAR(1000) NULL,
  rating         DECIMAL(3,2) NOT NULL DEFAULT 0,
  reviewCount    INT UNSIGNED NOT NULL DEFAULT 0,
  hasPromotion   TINYINT(1) NOT NULL DEFAULT 0,
  promotionText  VARCHAR(255) NULL,
  isActive       TINYINT(1) NOT NULL DEFAULT 1,
  hours          VARCHAR(255) NULL,
  INDEX idx_shops_postal (postalCode, isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CIVIC WALLETS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civic_wallets (
  user_id           INT PRIMARY KEY,
  available_balance INT NOT NULL DEFAULT 0,
  total_earned      INT NOT NULL DEFAULT 0,
  total_spent       INT NOT NULL DEFAULT 0,
  trust_score       INT NOT NULL DEFAULT 42,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CIVIC TRANSACTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS civic_transactions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  type        ENUM('bonus','earned','spent') NOT NULL,
  amount      INT NOT NULL,
  label       VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  mission_id  INT NULL,
  merchant_id INT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MISSIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(190) NOT NULL,
  description       TEXT NULL,
  reward_amount     INT NOT NULL DEFAULT 0,
  category          VARCHAR(60) NULL,
  icon              VARCHAR(60) NULL,
  validation_type   VARCHAR(60) NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  max_completions   INT NULL,
  completions_count INT NOT NULL DEFAULT 0,
  postal_code       VARCHAR(12) NOT NULL DEFAULT '7370',
  INDEX idx_missions_postal (postal_code, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MISSION COMPLETIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_completions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mission_id    INT NOT NULL,
  user_id       INT NOT NULL,
  credits_earned INT NULL,
  completed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mission_user (mission_id, user_id),
  INDEX idx_mc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REWARDS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  shop_id      INT NULL,
  title        VARCHAR(190) NOT NULL,
  cost_credits INT NOT NULL,
  postal_code  VARCHAR(12) NOT NULL DEFAULT '7370',
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_rewards_postal (postal_code, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REWARD CLAIMS (legacy) ───────────────────────────────
CREATE TABLE IF NOT EXISTS reward_claims (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  reward_id     INT NOT NULL,
  credits_spent INT NOT NULL,
  status        ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  claimed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EVENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(190) NOT NULL,
  description     TEXT NULL,
  category        VARCHAR(60) NOT NULL DEFAULT 'Autre',
  dateStart       DATETIME NOT NULL,
  dateEnd         DATETIME NULL,
  timeLabel       VARCHAR(120) NULL,
  location        VARCHAR(190) NOT NULL,
  address         VARCHAR(255) NOT NULL DEFAULT '',
  postalCode      VARCHAR(12) NOT NULL DEFAULT '',
  city            VARCHAR(120) NOT NULL DEFAULT '',
  imageUrl        VARCHAR(1000) NULL,
  isFree          TINYINT(1) NOT NULL DEFAULT 1,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  organizer       VARCHAR(190) NOT NULL DEFAULT '',
  organizerPhone  VARCHAR(40) NULL,
  organizerEmail  VARCHAR(190) NULL,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  isRecurring     TINYINT(1) NOT NULL DEFAULT 0,
  createdAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_postal (postalCode, status, dateStart)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── COMMUNAL ALERTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS communal_alerts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  message     TEXT NULL,
  type        VARCHAR(60) NULL,
  postalCode  VARCHAR(12) NOT NULL DEFAULT '',
  city        VARCHAR(120) NULL,
  startDate   DATETIME NULL,
  endDate     DATETIME NULL,
  isActive    TINYINT(1) NOT NULL DEFAULT 1,
  expiresAt   DATETIME NULL,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_postal (postalCode, isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REFRESH TOKENS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  token_hash     CHAR(64) NOT NULL UNIQUE,
  user_agent     VARCHAR(500) NULL,
  ip             VARCHAR(64) NULL,
  expires_at     DATETIME NOT NULL,
  revoked_at      DATETIME NULL,
  replaced_by_id BIGINT UNSIGNED NULL,
  INDEX idx_rt_user (user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EMAIL VERIFICATION TOKENS ────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  INDEX idx_evt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PASSWORD RESET TOKENS ────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  INDEX idx_prt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PUSH TOKENS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token       VARCHAR(500) NULL,
  platform    VARCHAR(32) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── USER DEVICES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_devices (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  open_id      VARCHAR(190) NOT NULL,
  platform     VARCHAR(32) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  UNIQUE KEY uq_device_user (user_id, open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AUDIT LOGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id  INT NULL,
  action         VARCHAR(100) NOT NULL,
  target_type    VARCHAR(60) NULL,
  target_id      VARCHAR(100) NULL,
  metadata       JSON NULL,
  ip             VARCHAR(64) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── WAITLIST ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(320) NOT NULL UNIQUE,
  postal_code VARCHAR(10) NULL,
  city        VARCHAR(128) NULL,
  role        VARCHAR(32) NOT NULL DEFAULT 'citoyen',
  source      VARCHAR(64) NOT NULL DEFAULT 'landing',
  confirmed   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
