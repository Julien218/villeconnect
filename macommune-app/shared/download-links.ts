// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
//
// Centralise tous les liens de téléchargement / accès à l'application.
// Les valeurs viennent des variables d'environnement EXPO_PUBLIC_* (voir .env)
// afin de pouvoir changer les URLs de déploiement sans toucher au code.
//
// Comment configurer (fichier .env à la racine de macommune-app/) :
//   EXPO_PUBLIC_WEB_APP_URL=https://app.dourconnect.be
//   EXPO_PUBLIC_DESKTOP_APP_URL=https://app.dourconnect.be
//   EXPO_PUBLIC_ANDROID_APP_URL=https://play.google.com/store/apps/details?id=be.jsinnovaia.macommune
//   EXPO_PUBLIC_IOS_APP_URL=
//
// Si une variable est vide, le lien correspondant est automatiquement
// désactivé et affiché comme "Bientôt disponible" dans la landing page.

export interface DownloadLinks {
  /** Ouvrir directement l'app dans le navigateur (PWA / web build Expo) */
  webApp: string;
  /** Installer l'app sur PC/Mac (PWA installable via navigateur) */
  desktopApp: string;
  /** Lien de téléchargement Android (Play Store ou APK direct) */
  android: string;
  /** Lien App Store iOS — vide tant que non publié */
  ios: string;
}

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

export const DOWNLOAD_LINKS: DownloadLinks = {
  webApp: clean(process.env.EXPO_PUBLIC_WEB_APP_URL) || 'https://app.dourconnect.be',
  desktopApp: clean(process.env.EXPO_PUBLIC_DESKTOP_APP_URL) || clean(process.env.EXPO_PUBLIC_WEB_APP_URL) || 'https://app.dourconnect.be',
  android: clean(process.env.EXPO_PUBLIC_ANDROID_APP_URL) || 'https://play.google.com/store/apps/details?id=be.jsinnovaia.macommune',
  ios: clean(process.env.EXPO_PUBLIC_IOS_APP_URL),
};

/** true si le lien iOS est configuré (App Store publié) */
export const IOS_AVAILABLE = DOWNLOAD_LINKS.ios.length > 0;

/** Statut lisible pour badge UI */
export function linkStatus(url: string): 'available' | 'soon' {
  return url && url.length > 0 ? 'available' : 'soon';
}
