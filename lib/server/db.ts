import mysql, { type Pool } from "mysql2/promise";

declare global {
  var __lineStickMysqlPool: Pool | undefined;
}

function requiredEnv(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  return String(value);
}

export function db(): Pool {
  if (!globalThis.__lineStickMysqlPool) {
    globalThis.__lineStickMysqlPool = mysql.createPool({
      host: requiredEnv("DB_HOST", "127.0.0.1"),
      port: Number(requiredEnv("DB_PORT", "3306")),
      database: requiredEnv("DB_NAME", "line_stick"),
      user: requiredEnv("DB_USER", "root"),
      password: requiredEnv("DB_PASS", ""),
      connectionLimit: 1,
      waitForConnections: true,
      namedPlaceholders: true,
      charset: "utf8mb4",
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return globalThis.__lineStickMysqlPool;
}

export async function ensureOrdersTable(): Promise<void> {
  await db().execute(`
    CREATE TABLE IF NOT EXISTS cms_orders (
      id VARCHAR(64) PRIMARY KEY,
      public_token VARCHAR(128) NULL,
      customer_json JSON NOT NULL,
      items_json JSON NOT NULL,
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
      payment_slip_image VARCHAR(255) NULL,
      payment_submitted_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_public_token (public_token),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
