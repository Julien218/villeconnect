/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VILLECONNECT — Security Module Entry Point                     ║
 * ║  © 2026 Julien Pagin — PROPRIETARY & CONFIDENTIAL              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export { verifyAppIntegrity, APP_WATERMARK, generateSessionFingerprint } from "./license-guard";
export { detectCompromisedDevice, isRunningInEmulator, enforceDeviceSecurity } from "./device-guard";
export { useScreenshotProtection, SECURE_TEXT_INPUT_PROPS } from "./screenshot-guard";
