-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — ROLLBACK migration 009
-- A UTILISER UNIQUEMENT si 009_links_dour.sql a été appliqué en prod ET pose problème
-- Pré-requis : aucun lien verified_by_commune=1 ne doit exister avant rollback

-- ── 1. SUPPRIMER les 10 liens insérés pour Dour ──────────────────────────────
-- Ciblé : uniquement les lignes insérées par la migration 009 (city_id Dour)
-- Si des liens ont été ajoutés manuellement depuis, les inspecter d'abord
DELETE FROM city_service_links
  WHERE city_id = (SELECT id FROM cities WHERE postal_code = '7370');

-- ── 2. SUPPRIMER le UNIQUE KEY ajouté ────────────────────────────────────────
DROP PROCEDURE IF EXISTS _vc_drop_uq_city_url;

DELIMITER //
CREATE PROCEDURE _vc_drop_uq_city_url()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'city_service_links'
      AND INDEX_NAME   = 'uq_city_url'
  ) THEN
    ALTER TABLE city_service_links DROP INDEX uq_city_url;
  END IF;
END //
DELIMITER ;

CALL _vc_drop_uq_city_url();
DROP PROCEDURE IF EXISTS _vc_drop_uq_city_url;

-- ── 3. REMETTRE l'ENUM sans citizen_account ───────────────────────────────────
ALTER TABLE city_service_links
  MODIFY COLUMN service_type
    ENUM(
      'website','eguichet','news','agenda','procedures',
      'waste','works','urban','cpas','contact',
      'associations','commerce','other'
    ) NOT NULL;

-- ── 4. VÉRIFICATION POST-ROLLBACK ────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM city_service_links
   WHERE city_id=(SELECT id FROM cities WHERE postal_code='7370')) AS liens_dour,
  (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='city_service_links'
   AND COLUMN_NAME='service_type') AS enum_actuel;
