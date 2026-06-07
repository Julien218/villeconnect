"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const promise_1 = __importDefault(require("mysql2/promise"));
const pool = promise_1.default.createPool({
    uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
});
exports.db = pool;
