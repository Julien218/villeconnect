// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  waitForConnections: true,
  // File d'attente bornée : en cas de surcharge, l'API répond vite par une erreur au lieu
  // d'accumuler des milliers de requêtes en mémoire jusqu'à tomber.
  queueLimit: 200,
  connectTimeout: 10_000,
  // Garde les connexions vivantes derrière un pare-feu ou un proxy qui coupe les connexions inactives.
  enableKeepAlive: true,
  keepAliveInitialDelay: 30_000,
});

export const db = pool;
