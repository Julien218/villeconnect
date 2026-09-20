-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 015 : données de démonstration (Dour 7370)
-- Uniquement pour l'environnement de dev Base44 — ne pas exécuter en production.

-- ─── SHOPS (legacy) ───────────────────────────────────────
INSERT IGNORE INTO shops (id, name, category, description, address, postalCode, city, phone, email, website, imageUrl, rating, reviewCount, hasPromotion, promotionText, isActive, hours) VALUES
(1, 'Boulangerie du Centre', 'Alimentation', 'Artisan boulanger — pain au levain naturel, pâtisseries maison.', 'Rue principale 12', '7370', 'Dour', '065/12.34.56', 'contact@boulangerieducentre.be', 'https://boulangerieducentre.be', NULL, 4.80, 127, 1, '-10% sur tous les pains le samedi', 1, 'Mar-Sam 06:30-18:30'),
(2, 'Pharmacie de Dour', 'Santé', 'Pharmacie de quartier — conseils personnalisés et produits de parapharmacie.', 'Place de la Mairie 3', '7370', 'Dour', '065/23.45.67', NULL, NULL, NULL, 4.50, 89, 0, NULL, 1, 'Lun-Ven 08:30-18:00, Sam 09:00-12:00'),
(3, 'Café Le Civic', 'Horeca', 'Café convivial — terrasse ensoleillée, brunch le dimanche.', 'Rue de la Station 8', '7370', 'Dour', '065/34.56.78', 'hello@cafelecivic.be', 'https://cafelecivic.be', NULL, 4.60, 203, 1, 'Brunch à 15€ au lieu de 19€ pour les citoyens CivicLoop', 1, 'Tous les jours 08:00-22:00'),
(4, 'Fleuriste Nature & Sens', 'Services', 'Bouquets frais, plantes vertes et conseils de jardinage.', 'Rue des Tilleuls 5', '7370', 'Dour', '065/45.67.89', NULL, NULL, NULL, 4.90, 56, 0, NULL, 1, 'Mar-Sam 09:00-17:30');

-- ─── COMMERCE CATALOG (publié) ─────────────────────────────
INSERT IGNORE INTO commerce_catalog (canonical_key, legacy_shop_id, name, category, description, address, postal_code, city_name, phone, email, website, image_url, rating, review_count, has_promotion, promotion_text, validation_status, publication_status, source, consent_publication, published_at)
VALUES
(SHA2('boulangerie du centre|rue principale 12|7370', 256), 1, 'Boulangerie du Centre', 'Alimentation', 'Artisan boulanger — pain au levain naturel, pâtisseries maison.', 'Rue principale 12', '7370', 'Dour', '065/12.34.56', 'contact@boulangerieducentre.be', 'https://boulangerieducentre.be', NULL, 4.80, 127, 1, '-10% sur tous les pains le samedi', 'approved', 'published', 'legacy', 1, CURRENT_TIMESTAMP),
(SHA2('pharmacie de dour|place de la mairie 3|7370', 256), 2, 'Pharmacie de Dour', 'Santé', 'Pharmacie de quartier — conseils personnalisés et produits de parapharmacie.', 'Place de la Mairie 3', '7370', 'Dour', '065/23.45.67', NULL, NULL, NULL, 4.50, 89, 0, NULL, 'approved', 'published', 'legacy', 1, CURRENT_TIMESTAMP),
(SHA2('cafe le civic|rue de la station 8|7370', 256), 3, 'Café Le Civic', 'Horeca', 'Café convivial — terrasse ensoleillée, brunch le dimanche.', 'Rue de la Station 8', '7370', 'Dour', '065/34.56.78', 'hello@cafelecivic.be', 'https://cafelecivic.be', NULL, 4.60, 203, 1, 'Brunch à 15€ au lieu de 19€ pour les citoyens CivicLoop', 'approved', 'published', 'legacy', 1, CURRENT_TIMESTAMP),
(SHA2('fleuriste nature & sens|rue des tilleuls 5|7370', 256), 4, 'Fleuriste Nature & Sens', 'Services', 'Bouquets frais, plantes vertes et conseils de jardinage.', 'Rue des Tilleuls 5', '7370', 'Dour', '065/45.67.89', NULL, NULL, NULL, 4.90, 56, 0, NULL, 'approved', 'published', 'legacy', 1, CURRENT_TIMESTAMP);

-- ─── MISSIONS ──────────────────────────────────────────────
INSERT IGNORE INTO missions (id, title, description, reward_amount, category, icon, validation_type, is_active, max_completions, completions_count, postal_code) VALUES
(1, 'Première visite', 'Bienvenue sur VilleConnect OS ! Découvrez les services de votre commune.', 50, 'civic', 'handshake', 'automatic', 1, NULL, 0, '7370'),
(2, 'Signaler un commerce local', 'Ajoutez un commerce de votre quartier pour aider vos voisins à le découvrir.', 30, 'commerce', 'store', 'manual', 1, NULL, 0, '7370'),
(3, 'Participer à un événement', 'Inscrivez-vous à un événement local et participez-y.', 40, 'culture', 'calendar', 'manual', 1, NULL, 0, '7370'),
(4, 'Recyclage exemplaire', 'Engagez-vous à trier correctement vos déchets pendant un mois.', 20, 'environment', 'leaf', 'automatic', 1, NULL, 0, '7370');

-- ─── REWARDS ──────────────────────────────────────────────
INSERT IGNORE INTO rewards (id, shop_id, title, cost_credits, postal_code, is_active) VALUES
(1, 1, 'Baguette tradition offerte', 40, '7370', 1),
(2, 3, 'Brunch citoyen à 15€', 80, '7370', 1),
(3, 4, 'Bouquet de saison -20%', 60, '7370', 1),
(4, 1, 'Pâtisserie offerte pour 10€ d''achat', 50, '7370', 1);

-- ─── EVENTS ───────────────────────────────────────────────
INSERT IGNORE INTO events (id, title, description, category, dateStart, dateEnd, timeLabel, location, address, postalCode, city, imageUrl, isFree, price, organizer, organizerPhone, organizerEmail, status, isRecurring) VALUES
(1, 'Marché de Dour', 'Marché hebdomadaire — producteurs locaux, artisanat, fleurs.', 'Marché', '2026-10-03 08:00:00', '2026-10-03 13:00:00', '08:00 - 13:00', 'Grand-Place de Dour', 'Grand-Place', '7370', 'Dour', NULL, 1, 0, 'Commune de Dour', '065/12.34.56', 'marche@dour.be', 'approved', 1),
(2, 'Concert d''automne', 'Concert gratuit par l''harmonie municipale de Dour.', 'Culture', '2026-10-11 19:30:00', '2026-10-11 22:00:00', '19:30 - 22:00', 'Salle culturelle de Dour', 'Rue de la Culture 1', '7370', 'Dour', NULL, 1, 0, 'Harmonie de Dour', '065/78.90.12', 'harmonie@dour.be', 'approved', 0),
(3, 'Atelier compostage', 'Atelier pratique sur le compostage domestique — inscription gratuite.', 'Environnement', '2026-10-18 14:00:00', '2026-10-18 16:30:00', '14:00 - 16:30', 'Centre environnemental', 'Rue Verte 7', '7370', 'Dour', NULL, 1, 0, 'Service Environnement Dour', '065/34.56.78', 'environnement@dour.be', 'approved', 0);

-- ─── COMMUNAL ALERTS ──────────────────────────────────────
INSERT IGNORE INTO communal_alerts (id, title, message, type, postalCode, city, startDate, endDate, isActive, expiresAt, createdAt) VALUES
(1, 'Travaux rue principale', 'Des travaux de voirie auront lieu rue principale du 5 au 15 octobre. Circulation alternée.', 'works', '7370', 'Dour', '2026-10-05 07:00:00', '2026-10-15 18:00:00', 1, '2026-10-16 00:00:00', CURRENT_TIMESTAMP),
(2, 'Collecte des déchets en avance', 'La collecte des déchets aura lieu 1h plus tôt le jeudi 9 octobre en raison de la fête communale.', 'waste', '7370', 'Dour', '2026-10-09 06:00:00', '2026-10-09 12:00:00', 1, '2026-10-09 23:59:59', CURRENT_TIMESTAMP);
