#!/usr/bin/env node
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
//
// FIX PERMANENT — Cloudflare Pages / Wrangler exclut par défaut tout dossier
// nommé "node_modules", même imbriqué profondément (ex: dist/assets/node_modules/...).
// Expo web y place les polices d'icônes (@expo/vector-icons) et certains assets
// d'expo-router. Sans ce script, ces fichiers ne sont jamais uploadés : Cloudflare
// sert alors du HTML (fallback SPA) à leur place, et les icônes s'affichent en
// carrés vides (tofu) sur le site en production.
//
// Ce script s'exécute après `expo export --platform web` (voir package.json:
// "build:web": "expo export --platform web && node scripts/fix-web-assets.js").
// Il renomme dist/assets/node_modules → dist/assets/vendor_modules et met à jour
// toutes les références dans les bundles JS générés en conséquence.
//
// À exécuter avant CHAQUE déploiement Cloudflare Pages du build web.

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const OLD_DIR = path.join(DIST, 'assets', 'node_modules');
const NEW_DIR = path.join(DIST, 'assets', 'vendor_modules');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('[fix-web-assets] dist/ introuvable — lance d\'abord `expo export --platform web`.');
    process.exit(1);
  }

  if (fs.existsSync(OLD_DIR)) {
    fs.renameSync(OLD_DIR, NEW_DIR);
    console.log('[fix-web-assets] Renommé assets/node_modules → assets/vendor_modules');
  } else if (fs.existsSync(NEW_DIR)) {
    console.log('[fix-web-assets] Déjà renommé, rien à faire côté dossier.');
  } else {
    console.log('[fix-web-assets] Aucun dossier assets/node_modules trouvé (rien à corriger).');
    return;
  }

  const jsFiles = walk(DIST).filter(f => f.endsWith('.js'));
  let totalReplacements = 0;
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('assets/node_modules/')) {
      const updated = content.split('assets/node_modules/').join('assets/vendor_modules/');
      fs.writeFileSync(file, updated);
      const count = (content.match(/assets\/node_modules\//g) || []).length;
      totalReplacements += count;
      console.log(`[fix-web-assets] ${path.relative(DIST, file)}: ${count} référence(s) corrigée(s)`);
    }
  }

  console.log(`[fix-web-assets] Terminé — ${totalReplacements} référence(s) mise(s) à jour au total.`);
}

main();
