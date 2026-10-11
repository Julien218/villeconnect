// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Vérification des variables d'environnement au démarrage : le serveur refuse de démarrer
// avec une configuration dangereuse plutôt que de tomber en erreur plus tard, requête par requête.

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER = /^change_me/i;

function secretProblem(name: string, value: string | undefined): string | null {
  if (!value) return `${name} est absente`;
  if (PLACEHOLDER.test(value)) return `${name} contient encore la valeur d'exemple`;
  if (value.length < MIN_SECRET_LENGTH) return `${name} doit contenir au moins ${MIN_SECRET_LENGTH} caractères`;
  return null;
}

/** Retourne la liste des problèmes de configuration (vide si tout est correct). */
export function findConfigProblems(env: Record<string, string | undefined> = process.env): string[] {
  const problems: string[] = [];
  const isProduction = env.NODE_ENV === 'production';

  const jwt = secretProblem('JWT_SECRET', env.JWT_SECRET);
  if (jwt) problems.push(jwt);

  if (!env.DATABASE_URL && !env.MYSQL_URL) {
    problems.push('DATABASE_URL (ou MYSQL_URL) est absente');
  }

  // Paiement en ligne : optionnel, mais s'il est activé il doit être complet.
  if (env.STRIPE_SECRET_KEY) {
    if (!env.STRIPE_WEBHOOK_SECRET) problems.push('STRIPE_WEBHOOK_SECRET est absente alors que Stripe est activé');
    if (!env.WEB_APP_URL || !env.WEB_APP_URL.trim()) problems.push('WEB_APP_URL est absente alors que Stripe est activé');
  }

  if (isProduction) {
    const salt = secretProblem('CITY_HASH_SALT', env.CITY_HASH_SALT);
    if (salt) problems.push(salt);
    if (!env.CORS_ORIGINS || !env.CORS_ORIGINS.trim()) {
      problems.push('CORS_ORIGINS doit être défini en production');
    }
  }
  return problems;
}

/** À appeler une seule fois au démarrage. Arrête le processus si la configuration est invalide. */
export function assertConfig(): void {
  const problems = findConfigProblems();
  if (problems.length === 0) return;
  console.error(JSON.stringify({ level: 'fatal', scope: 'config', problems }));
  process.exit(1);
}
