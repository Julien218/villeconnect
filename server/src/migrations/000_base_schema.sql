-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 000 : schéma de base RECONSTRUIT (remplace 001 à 006, absentes du dépôt)
-- MySQL 8+, idempotente (CREATE TABLE IF NOT EXISTS).
--
-- À QUOI ÇA SERT : créer une base neuve (développement, tests, démonstration, nouvel environnement).
-- Les colonnes sont déduites des requêtes du serveur (server/src). En production, ces tables
-- existent déjà : ce fichier ne les modifie pas, mais ne pas s'en servir pour « réparer » une base
-- existante sans comparer d'abord avec DESCRIBE.
-- Les tables du Wallet (retiré de l'app) ne sont pas recréées ici.

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  openId VARCHAR(128) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(120) NULL,
  role ENUM('citizen', 'merchant', 'city_admin', 'admin', 'super_admin') NOT NULL DEFAULT 'citizen',
  loginMethod VARCHAR(32) NULL,
  postalCode VARCHAR(12) NULL,
  city VARCHAR(120) NULL,
  theme_preference VARCHAR(16) NOT NULL DEFAULT 'auto',
  email_verified_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  lastSignedIn DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_openid (openId),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  replaced_by_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY idx_refresh_user (user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_hash (token_hash),
  KEY idx_email_verification_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_hash (token_hash),
  KEY idx_password_reset_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_devices (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  open_id VARCHAR(128) NOT NULL,
  platform VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_devices_open_id (open_id),
  KEY idx_user_devices_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS push_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_push_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id VARCHAR(80) NULL,
  metadata JSON NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ancienne table des commerces : lue par la migration 011 (reprise vers commerce_catalog)
-- et par le routeur de compatibilité « shops ».
CREATE TABLE IF NOT EXISTS shops (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NULL,
  description TEXT NULL,
  address VARCHAR(255) NULL,
  postalCode VARCHAR(12) NULL,
  city VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(500) NULL,
  imageUrl VARCHAR(500) NULL,
  rating DECIMAL(3,2) NULL,
  reviewCount INT NULL,
  hasPromotion TINYINT(1) NOT NULL DEFAULT 0,
  promotionText VARCHAR(255) NULL,
  hours VARCHAR(255) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_shops_postal (postalCode, isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Autre',
  dateStart DATETIME NOT NULL,
  dateEnd DATETIME NULL,
  timeLabel VARCHAR(60) NULL,
  location VARCHAR(160) NULL,
  address VARCHAR(255) NULL,
  postalCode VARCHAR(12) NOT NULL,
  city VARCHAR(120) NULL,
  imageUrl VARCHAR(500) NULL,
  isFree TINYINT(1) NOT NULL DEFAULT 1,
  price VARCHAR(60) NULL,
  organizer VARCHAR(160) NULL,
  organizerEmail VARCHAR(255) NULL,
  organizerPhone VARCHAR(40) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  isRecurring TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_public (postalCode, status, dateStart),
  KEY idx_events_category (postalCode, category, dateStart)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS communal_alerts (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'info',
  postalCode VARCHAR(12) NOT NULL,
  city VARCHAR(120) NULL,
  startDate DATETIME NULL,
  endDate DATETIME NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alerts_active (postalCode, isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waitlist (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  postal_code VARCHAR(12) NULL,
  city VARCHAR(120) NULL,
  role VARCHAR(40) NULL,
  source VARCHAR(60) NULL,
  confirmed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waitlist_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
