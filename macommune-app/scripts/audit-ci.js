#!/usr/bin/env node
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
//
// AUDIT CI — Remplace `npm audit --omit=dev --audit-level=high` dans la CI.
// Même règle (toute alerte haute ou critique fait échouer), avec une liste
// d'exceptions datées pour les alertes SANS correctif publié en amont.
//
// Règles de la liste d'exceptions :
//   - une exception vise UNE alerte précise (identifiant GHSA), jamais un paquet entier ;
//   - chaque exception a une date d'expiration : passée cette date, la CI échoue
//     de nouveau tant qu'on n'a pas revérifié (correctif publié ? prolonger ?) ;
//   - une nouvelle alerte haute/critique fait toujours échouer la CI.

const { execSync } = require('child_process');

const EXCEPTIONS = [
  {
    id: 'GHSA-vfj7-8cjw-p6xm',
    paquet: 'braces',
    raison: "Aucune version corrigée publiée (3.0.3 = dernière). Utilisé par metro-file-map (outil de build), absent de l'app livrée.",
    expire: '2027-01-11',
  },
  {
    id: 'GHSA-86w9-cpqp-85rv',
    paquet: 'node-forge',
    raison: "Aucune version corrigée publiée (1.4.0 = dernière). Utilisé par @expo/cli et la signature de code d'expo-updates, côté outillage.",
    expire: '2027-01-11',
  },
];

const NIVEAUX_BLOQUANTS = new Set(['high', 'critical']);

function lancerAudit() {
  try {
    return execSync('npm audit --omit=dev --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    // npm audit sort en code 1 dès qu'il trouve une alerte : la sortie JSON reste valide.
    if (err.stdout) return err.stdout;
    throw err;
  }
}

const rapport = JSON.parse(lancerAudit());
if (rapport.error) {
  console.error('[audit-ci] npm audit a échoué :', rapport.error.summary || rapport.error);
  process.exit(1);
}

// Les entrées « via » sous forme d'objet sont les alertes d'origine ; les chaînes
// ne sont que des dépendances transitives qui héritent de ces alertes.
const alertes = new Map();
for (const vuln of Object.values(rapport.vulnerabilities || {})) {
  for (const via of vuln.via) {
    if (typeof via !== 'object' || !NIVEAUX_BLOQUANTS.has(via.severity)) continue;
    const id = (via.url || '').split('/').pop() || String(via.source);
    alertes.set(id, { id, paquet: via.name, niveau: via.severity, titre: via.title, url: via.url });
  }
}

const aujourdHui = new Date().toISOString().slice(0, 10);
const bloquantes = [];
const tolerees = [];
const expirees = [];

for (const alerte of alertes.values()) {
  const exception = EXCEPTIONS.find((e) => e.id === alerte.id);
  if (!exception) bloquantes.push(alerte);
  else if (exception.expire < aujourdHui) expirees.push({ ...alerte, expire: exception.expire });
  else tolerees.push({ ...alerte, expire: exception.expire });
}

for (const a of tolerees) {
  console.log(`[audit-ci] Exception active jusqu'au ${a.expire} : ${a.paquet} ${a.id} (${a.niveau})`);
}
for (const e of EXCEPTIONS) {
  if (!alertes.has(e.id)) {
    console.log(`[audit-ci] L'exception ${e.id} (${e.paquet}) n'est plus nécessaire : la retirer de scripts/audit-ci.js.`);
  }
}
for (const a of expirees) {
  console.error(`[audit-ci] Exception EXPIRÉE le ${a.expire} : ${a.paquet} ${a.id}. Vérifier si un correctif existe, sinon prolonger.`);
}
for (const a of bloquantes) {
  console.error(`[audit-ci] ${a.niveau.toUpperCase()} ${a.paquet} : ${a.titre} — ${a.url}`);
}

if (bloquantes.length || expirees.length) {
  console.error(`[audit-ci] Échec : ${bloquantes.length} alerte(s) bloquante(s), ${expirees.length} exception(s) expirée(s).`);
  process.exit(1);
}
console.log(`[audit-ci] OK : aucune alerte haute ou critique hors exceptions (${tolerees.length} tolérée(s)).`);
