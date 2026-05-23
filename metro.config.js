/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.warn", "console.error"],
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
        unsafe_proto: true,
        dead_code: true,
        global_defs: { DEBUG: false },
      },
      mangle: {
        toplevel: true,
        eval: true,
        reserved: [],
      },
      output: {
        comments: false,
        ascii_only: true,
        beautify: false,
      },
      sourceMap: false,
    },
  };
}

// Bloquer l'accès aux fichiers sensibles
config.resolver = {
  ...config.resolver,
  blockList: [
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /\/__tests__\//,
    /\/\.git\//,
  ],
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
