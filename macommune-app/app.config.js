// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Configuration Expo dynamique — étend app.json.
//
// En sandbox Base44 (BASE44_PREVIEW_MODE=1), le dev server Expo rejette par défaut
// toute requête dont l'Origin n'est pas localhost. On déclare l'origine publique du
// preview dans extra.router.origin pour que le CorsMiddleware l'autorise.
// Hors sandbox, ce fichier est transparent : il retourne la config de app.json telle quelle.

const isPreview = process.env.BASE44_PREVIEW_MODE === '1';
const previewOrigin = isPreview ? process.env.EXPO_PUBLIC_WEB_APP_URL : undefined;

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    router: {
      ...config.extra?.router,
      ...(previewOrigin ? { origin: previewOrigin } : {}),
    },
  },
});
