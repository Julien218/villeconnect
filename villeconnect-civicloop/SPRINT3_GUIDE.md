# 🚀 SPRINT 3 — CivicLoop Implementation Guide
## Ma Commune / VilleConnect — JS-Innov.IA © 2026

---

## ✅ CE QUI EST FAIT (Sprint 3)

### Base de données (18 tables en prod Railway)
6 nouvelles tables créées et seeded :
- `civic_wallets` — wallet par utilisateur (balance, trust score)
- `civic_transactions` — historique (earned/spent/bonus/sponsor)
- `missions` — missions citoyennes par code postal
- `mission_completions` — anti-doublon par user
- `rewards` — récompenses marketplace
- `reward_claims` — QR codes générés

**Seed Dour (7370) :**
- 6 missions : Bienvenue, Voirie, Commerce, Événement, Entraide, Commune
- 4 récompenses : Café, Boucherie -10%, Lavage voiture, Bon Colruyt 5€

### Backend tRPC (civicloopRouter.ts)
9 endpoints :
- `getWallet` — wallet + auto-création avec 50CC bonus bienvenue
- `getTransactions` — historique pageable
- `getMissions` — missions actives par postal
- `getMissionStatus` — avec état complété par user
- `completeMission` — validation + crédit automatique
- `getRewards` — marketplace par postal
- `claimReward` — achat + génération QR code unique (VC-XXXXXXXXXXXX)
- `getMyClaims` — mes QR codes réclamés

### Mobile (wallet.tsx)
Écran complet avec 3 onglets :
- **🎯 Missions** — liste avec bouton "Valider" ou badge "QR requis"
- **🎁 Récompenses** — marketplace avec vérification de solde
- **📋 Historique** — toutes les transactions

Hero card :
- Solde en grand (balance CivicCredits)
- Stats : Gagnés / Dépensés / Trust Score
- Barre de progression Trust Score (0-100%)

---

## 📋 INTÉGRATION DANS LE PROJET EXISTANT

### 1. Ajouter le router dans server/routers.ts
```typescript
import { civicloopRouter } from './civicloopRouter';

export const appRouter = router({
  // ... routers existants
  civicloop: civicloopRouter,
});
```

### 2. Ajouter l'onglet dans app/(tabs)/_layout.tsx
```typescript
<Tabs.Screen
  name="wallet"
  options={{
    title: 'CivicLoop',
    tabBarIcon: ({ color }) => <TabBarIcon name="wallet" color={color} />,
    tabBarLabel: 'Wallet',
  }}
/>
```

### 3. Copier wallet.tsx dans app/(tabs)/wallet.tsx

### 4. Copier civicloopRouter.ts dans server/civicloopRouter.ts

---

## 🔄 FLUX UTILISATEUR

```
Nouveau user → getWallet() → Wallet créé auto + 50CC bonus bienvenue
     ↓
Missions actives affichées
     ↓
User complète mission → +CC crédités → Trust Score +1
     ↓
Marketplace disponible → Réclame récompense → QR Code généré
     ↓
Présente QR au commerçant → Validé → Status "used"
```

---

## 🎯 PROCHAINES ÉTAPES (Sprint 4)

- [ ] Auth réelle (vrais comptes email/password)
- [ ] QR Scanner (expo-camera) pour missions QR
- [ ] Dashboard commerçant web (valider les QR)
- [ ] Modal RGPD + CGU au 1er lancement
- [ ] Push notification "Mission disponible"
- [ ] Leaderboard local (top citoyens de Dour)
