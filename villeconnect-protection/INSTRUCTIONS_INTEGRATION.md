# 🔒 Guide d'intégration des protections VilleConnect

## Ce qui a été créé

### 1. `lib/security/license-guard.ts`
- Vérification d'intégrité du bundle au démarrage
- Watermark numérique invisible (traçable en cas de fuite)
- Génération d'empreinte de session

### 2. `lib/security/device-guard.ts`
- Détection d'appareils rootés (Android) / jailbreakés (iOS)
- Blocage des émulateurs non autorisés en production

### 3. `lib/security/screenshot-guard.ts`
- Hook `useScreenshotProtection()` à appeler dans les screens sensibles
- Empêche les captures d'écran via FLAG_SECURE (Android)

### 4. `components/security/SecurityProvider.tsx`
- Wrapper global à intégrer dans `app/_layout.tsx`
- Effectue toutes les vérifications au démarrage

### 5. `metro.config.obfuscation.js`
- Configuration Metro avec minification agressive en production
- Suppression des console.log et source maps
- 3 passes de compression Terser

### 6. `LICENSE` + `NOTICE`
- Licence propriétaire complète (droit belge)
- Avis de copyright sur chaque fichier

---

## Intégration étape par étape

### Étape 1 — Copier les fichiers
```bash
cp lib/security/* ../lib/security/
cp components/security/* ../components/security/
cp LICENSE ../
cp NOTICE ../
```

### Étape 2 — Intégrer SecurityProvider dans `app/_layout.tsx`
```tsx
// Ajouter en haut du fichier :
import { SecurityProvider } from "@/components/security/SecurityProvider";

// Envelopper le contenu dans RootLayout :
return (
  <ThemeProvider>
    <SafeAreaProvider>
      <SecurityProvider>   {/* ← AJOUTER */}
        {content}
      </SecurityProvider>   {/* ← AJOUTER */}
    </SafeAreaProvider>
  </ThemeProvider>
);
```

### Étape 3 — Mettre à jour metro.config.js
Fusionner le contenu de `metro.config.obfuscation.js` avec votre `metro.config.js` existant.

### Étape 4 — Ajouter le header copyright sur chaque fichier
Coller ce bloc en haut de chaque `.tsx` / `.ts` :
```ts
/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
```

### Étape 5 — Activer la protection screenshot sur les screens sensibles
```tsx
import { useScreenshotProtection } from "@/lib/security";

export default function ProfileScreen() {
  useScreenshotProtection(true); // ← Ajouter dans les screens avec données perso
  // ...
}
```

### Étape 6 — Installer expo-screen-capture (optionnel, pour iOS)
```bash
npx expo install expo-screen-capture
```
Puis mettre à jour `screenshot-guard.ts` pour utiliser `usePreventScreenCapture()` d'expo.

---

## Protection supplémentaire recommandée

| Couche | Outil | Priorité |
|--------|-------|----------|
| Obfuscation avancée | `javascript-obfuscator` | ⭐⭐⭐ |
| Certificate pinning | `react-native-ssl-pinning` | ⭐⭐⭐ |
| Anti-tamper runtime | `expo-screen-capture` | ⭐⭐ |
| Jailbreak detection | `react-native-device-info` | ⭐⭐ |
| Chiffrement stockage | `expo-secure-store` | ⭐⭐⭐ |

---

## Notes légales

Le fichier `LICENSE` couvre l'intégralité du projet sous licence propriétaire belge.
En cas de violation, vous pouvez engager une procédure en contrefaçon.

Pour dépôt légal officiel en Belgique :
→ **SOFAM** (pour les œuvres numériques) : https://www.sofam.be
→ **SPF Économie** — Enregistrement de marque : https://economie.fgov.be
