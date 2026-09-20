// Base44 dev environment — bind Metro to all interfaces for Docker preview access.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow the dev server to be reached from the preview proxy (not just localhost).
config.server = config.server || {};
config.server.host = '0.0.0.0';

module.exports = config;
