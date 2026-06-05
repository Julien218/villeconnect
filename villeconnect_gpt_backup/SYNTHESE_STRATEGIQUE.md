# 🧠 SYNTHÈSE STRATÉGIQUE — GPT vs VilleConnect Agent
## Analyse consolidée — 06/06/2026

---

## CE QUE GPT A PENSÉ (Vision produit complète)

### Modules validés par GPT
1. **Portail Citoyen** — accueil, notifications, recherche globale
2. **DCI** — démarche citoyenne intelligente en langage naturel
3. **Vitrines Commerçantes** — vitrine, produits, promos, RDV
4. **Garages & Artisans** — vitrine, devis, véhicules
5. **Espace Communal** — infos officielles, alertes, RDV commune
6. **CivicLoop / Wallet Civique** — crédits non-monétaires, missions, récompenses
7. **Missions & QR** — scan QR, validation, earn credits
8. **Marketplace** — dépenser les crédits chez les commerçants
9. **Entraide citoyenne** — Trust Score, chat sécurisé, modération IA
10. **Dashboard Commune (Web)** — stats, export CSV/PDF, gestion missions

### Architecture GPT recommandée
- PostgreSQL multi-tenant (city_id partout)
- NestJS ou Go backend
- Flutter mobile
- Redis cache
- ElasticSearch
- Kubernetes

### Légal / RGPD pensé par GPT
- Modal consentement double checkbox (CGU + RGPD)
- CivicLoop clarifié : NON monétaire, NON MiCA, limité à la ville
- Protection marque BOIP/EUIPO
- DPO visible, hébergement UE

### Modèle économique GPT
- Abonnements commerces : 29€ → 79€/mois
- Abonnements garages : 39€ → 99€/mois
- Publicité locale (carrousel)
- Licence communale annuelle
- Options IA supplémentaires

---

## CE QUE NOUS AVONS DÉJÀ CONSTRUIT (VilleConnect Agent)

### ✅ Stack production déployée
- React Native + Expo (mobile "Ma Commune")
- tRPC + Drizzle ORM (API)
- MySQL Railway (production)
- Backend live: villeconnect-production.up.railway.app
- 12 tables DB + seed Dour

### ✅ Features développées
- Auth par code postal belge (BELGIAN_CITIES)
- Shops, garages, events, DCI, alertes communales
- Push notifications (4 canaux Android)
- Fuel tracker (API Statbel SPF Économie)
- Landing page "Ma Commune" (waitlist)
- Portail web organisateurs événements
- Connexion inter-agents (DourConnect2 API)
- Sécurité : obfuscation, license guard, screenshot guard

### ✅ Automatisation
- Worker push (rappels J-1 événements)
- Sync événements DourConnect2 ↔ VilleConnect
- Railway CI/CD automatisé

---

## GAP ANALYSIS — Ce qui reste à faire

### 🔴 CRITIQUE (manque vs vision GPT)
| Feature | Status |
|---|---|
| CivicLoop / Wallet Civique | ❌ Non implémenté |
| Missions + Scan QR | ❌ Non implémenté |
| Marketplace (dépense credits) | ❌ Non implémenté |
| Trust Score citoyen | ❌ Non implémenté |
| Entraide + chat | ❌ Non implémenté |
| Dashboard Commune Web | ⚠️ Partiel (portail events uniquement) |
| RGPD modal consentement | ❌ Non implémenté |
| RDV commerçants (agenda) | ❌ Non implémenté |

### 🟡 PARTIEL (base existe, à enrichir)
| Feature | Status |
|---|---|
| Auth utilisateur | ⚠️ Basique (code postal only, pas de vrai compte) |
| Vitrines commerces | ⚠️ Liste statique, pas de gestion commerçant |
| DCI | ⚠️ Soumission OK, pas de distribution IA |
| Events | ✅ Complet + portail web |
| Alertes communales | ✅ Complet |
| Push notifications | ✅ Complet |
| Fuel tracker | ✅ Complet |

### 🟢 COMPLET
| Feature | Status |
|---|---|
| Infrastructure Railway | ✅ |
| DB MySQL 12 tables | ✅ |
| Auth code postal | ✅ |
| Push notifications | ✅ |
| Landing page waitlist | ✅ |
| Inter-agents DourConnect2 | ✅ |
| Sécurité / protection | ✅ |

---

## PLAN D'ACTION RECOMMANDÉ (Sprint 3)

### Priorité 1 — CivicLoop (LA killer feature)
Ajouter 3 tables: civic_wallets, civic_transactions, missions
Implémenter le wallet dans le profil utilisateur
Créer les premières missions simples (sans QR d'abord)

### Priorité 2 — Auth réelle
Passer de l'auth "fantôme" à de vrais comptes utilisateurs
Email + mot de passe OU itsme® belge

### Priorité 3 — Espace commerçant
Dashboard commerçant web simple
Gestion promotions et vitrines

### Priorité 4 — RGPD modal
Consentement CGU + RGPD au premier lancement
DPO contact visible

### Priorité 5 — Dashboard Commune enrichi
Ajouter stats engagement, export CSV
Gestion missions depuis le web
