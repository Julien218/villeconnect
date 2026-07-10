-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 009 : liens publics Dour + ENUM citizen_account
-- Idempotente (procédure stockée + ON DUPLICATE KEY UPDATE)
-- Compatible MySQL 8.0.x et MySQL 9.x

-- ── 1. ÉTENDRE l'ENUM service_type avec citizen_account ─────────────────────
ALTER TABLE city_service_links
  MODIFY COLUMN service_type
    ENUM(
      'website','eguichet','citizen_account','news','agenda',
      'procedures','waste','works','urban','cpas',
      'contact','associations','commerce','other'
    ) NOT NULL;

-- ── 2. AJOUTER UNIQUE KEY (city_id, url) si absente — idempotent ─────────────
DROP PROCEDURE IF EXISTS _vc_add_uq_city_url;

DELIMITER //
CREATE PROCEDURE _vc_add_uq_city_url()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'city_service_links'
      AND INDEX_NAME   = 'uq_city_url'
  ) THEN
    ALTER TABLE city_service_links
      ADD UNIQUE KEY uq_city_url (city_id, url(255));
  END IF;
END //
DELIMITER ;

CALL _vc_add_uq_city_url();
DROP PROCEDURE IF EXISTS _vc_add_uq_city_url;

-- ── 3. INSÉRER les 10 liens Dour 7370 ────────────────────────────────────────
INSERT INTO city_service_links
  (city_id, service_type, label, url,
   verified_by_commune, verification_status, is_active, added_by)
VALUES
  ((SELECT id FROM cities WHERE postal_code='7370'),
   'website', 'Site officiel — Commune de Dour',
   'https://www.communedour.be',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'eguichet', 'E-Guichet Dour',
   'https://dour.egovflow.be/',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'citizen_account', 'Mon compte citoyen',
   'https://dour.guichet-citoyen.be/',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'procedures', 'Démarches de A à Z',
   'https://www.communedour.be/vivreadour/mes-demarches-de-a-a-z',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'contact', 'Horaires & contacts services',
   'https://www.communedour.be/ma-commune/services-communaux/horaires-des-services',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'cpas', 'CPAS de Dour',
   'https://www.communedour.be/ma-commune/social/cpas',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'waste', 'Collecte des déchets',
   'https://www.communedour.be/vivreadour/environnement/gestion-des-dechets',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'agenda', 'Agenda officiel Dour',
   'https://www.communedour.be/agenda',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'associations', 'Annuaire officiel Dour',
   'https://www.communedour.be/annuaire',
   0, 'pending_verification', 1, 'admin'),

  ((SELECT id FROM cities WHERE postal_code='7370'),
   'commerce', 'Synergie Dour — Commerçants & Indépendants',
   'https://www.synergiedour.be',
   0, 'pending_verification', 1, 'admin')

ON DUPLICATE KEY UPDATE
  label               = VALUES(label),
  service_type        = VALUES(service_type),
  verified_by_commune = VALUES(verified_by_commune),
  is_active           = VALUES(is_active),
  updated_at          = NOW();

-- ── 4. VÉRIFICATION POST-MIGRATION ───────────────────────────────────────────
SELECT
  csl.id,
  csl.service_type,
  csl.label,
  LEFT(csl.url, 55)        AS url_preview,
  csl.verified_by_commune  AS vc,
  csl.verification_status  AS vstatus
FROM city_service_links csl
JOIN cities c ON c.id = csl.city_id
WHERE c.postal_code = '7370'
ORDER BY csl.id;
