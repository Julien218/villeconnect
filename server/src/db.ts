// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

export const db = pool;
