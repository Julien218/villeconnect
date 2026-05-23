/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VILLECONNECT — Metro Config avec Obfuscation                   ║
 * ║  © 2026 Julien Pagin — PROPRIETARY & CONFIDENTIAL              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * INSTRUCTIONS D'INTÉGRATION :
 * Fusionner ce contenu avec votre metro.config.js existant.
 * Installer : npm install --save-dev javascript-obfuscator metro-transform-plugins
 */

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ── Obfuscation en production ─────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  // Transformation personnalisée pour obfusquer le JS bundle
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      // Terser options — minification agressive
      compress: {
        drop_console: true,        // Supprime tous les console.log
        drop_debugger: true,       // Supprime les debugger statements
        pure_funcs: ["console.log", "console.info", "console.warn"],
        passes: 3,                 // 3 passes de compression
        unsafe: true,
        unsafe_comps: true,
        unsafe_proto: true,
      },
      mangle: {
        toplevel: true,            // Renomme les variables globales
        eval: true,
        reserved: [],
      },
      output: {
        comments: false,           // Supprime TOUS les commentaires
        ascii_only: true,
        beautify: false,
      },
      sourceMap: false,            // Pas de source maps en production !
    },
  };
}

// ── Bloquer l'accès aux fichiers sensibles ────────────────────────────────
config.resolver = {
  ...config.resolver,
  blockList: [
    // Bloquer les fichiers de debug et de test
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /\/__tests__\//,
    /\/\.git\//,
    // Bloquer les fichiers de configuration sensibles
    /\/scripts\//,
  ],
};

module.exports = withNativeWind(config, { input: "./global.css" });
