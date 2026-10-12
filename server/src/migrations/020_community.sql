-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- Citoyens : annonces entre voisins (vendre, donner, prêter/louer, chercher, entraide),
-- messagerie liée à une annonce, signalements, blocages et exclusions.
-- À appliquer manuellement, après sauvegarde de la base. Aucun contenu n'est inséré.

CREATE TABLE IF NOT EXISTS community_listings (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  kind ENUM('sell', 'give', 'lend', 'wanted', 'help') NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  price_cents INT NULL,
  price_unit ENUM('fixed', 'per_day') NULL,
  postal_code VARCHAR(12) NOT NULL,
  status ENUM('pending', 'published', 'closed', 'rejected', 'removed') NOT NULL DEFAULT 'pending',
  ai_verdict ENUM('approve', 'review', 'reject') NULL,
  ai_note VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listings_public (postal_code, status, expires_at, id),
  KEY idx_listings_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_conversations (
  id INT NOT NULL AUTO_INCREMENT,
  listing_id INT NOT NULL,
  owner_id INT NOT NULL,
  requester_id INT NOT NULL,
  last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversation (listing_id, requester_id),
  KEY idx_conv_owner (owner_id, last_message_at),
  KEY idx_conv_requester (requester_id, last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_messages (
  id INT NOT NULL AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  body VARCHAR(1000) NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msg_conversation (conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_reports (
  id INT NOT NULL AUTO_INCREMENT,
  listing_id INT NOT NULL,
  reporter_id INT NOT NULL,
  reason ENUM('forbidden', 'scam', 'abuse', 'other') NOT NULL,
  details VARCHAR(300) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report (listing_id, reporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_blocks (
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_bans (
  user_id INT NOT NULL,
  reason VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
