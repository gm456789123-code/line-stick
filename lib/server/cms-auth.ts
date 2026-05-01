import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";

export type CmsUser = {
  id: number;
  username: string;
  role: "superadmin" | "dev" | "admin" | "editor" | string;
};

type SessionRow = RowDataPacket & {
  token: string;
  user_id: number;
  username: string;
  role: string;
  expires_at: Date | string;
};

const COOKIE_NAME = "cms_session";
const SESSION_TTL_DAYS = 7;
let authInitPromise: Promise<void> | null = null;

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await db().execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureAuthTables(): Promise<void> {
  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = (async () => {
    await db().execute(`
      CREATE TABLE IF NOT EXISTS cms_admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'admin',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db().execute(`
      CREATE TABLE IF NOT EXISTS cms_sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Backward-compat: old tables may exist without these columns.
    if (!(await hasColumn("cms_admin_users", "password"))) {
      await db().execute("ALTER TABLE cms_admin_users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT ''");
    }
    if (!(await hasColumn("cms_admin_users", "role"))) {
      await db().execute("ALTER TABLE cms_admin_users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'admin'");
    }
    if (!(await hasColumn("cms_admin_users", "is_active"))) {
      await db().execute("ALTER TABLE cms_admin_users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
    }
    if (!(await hasColumn("cms_admin_users", "updated_at"))) {
      await db().execute(
        "ALTER TABLE cms_admin_users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      );
    }
    if (!(await hasColumn("cms_admin_users", "created_at"))) {
      await db().execute(
        "ALTER TABLE cms_admin_users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
      );
    }

    await db().execute(
      "INSERT IGNORE INTO cms_admin_users (username, password, role, is_active) VALUES ('admin', 'admin123', 'superadmin', 1)"
    );

    const devUser = String(process.env.CMS_DEV_USER || "dev").trim();
    const devPass = String(process.env.CMS_DEV_PASS || "dev123").trim();
    if (devUser && devPass) {
      await db().execute(
        "INSERT IGNORE INTO cms_admin_users (username, password, role, is_active) VALUES (?, ?, 'dev', 1)",
        [devUser, devPass]
      );
    }

    // Backfill passwords for legacy rows that came from older schema.
    await db().execute("UPDATE cms_admin_users SET password = 'admin123' WHERE username = 'admin' AND COALESCE(password, '') = ''");
    if (devUser && devPass) {
      await db().execute("UPDATE cms_admin_users SET password = ? WHERE username = ? AND COALESCE(password, '') = ''", [
        devPass,
        devUser,
      ]);
    }
  })();

  try {
    await authInitPromise;
  } catch (error) {
    authInitPromise = null;
    throw error;
  }
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const idx = part.indexOf("=");
      if (idx <= 0) return acc;
      acc[part.slice(0, idx)] = decodeURIComponent(part.slice(idx + 1));
      return acc;
    }, {});
}

function mapSessionUser(row: SessionRow): CmsUser {
  return {
    id: Number(row.user_id || 0),
    username: String(row.username || ""),
    role: String(row.role || "admin"),
  };
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export async function loginCmsUser(username: string, password: string): Promise<{ token: string; user: CmsUser } | null> {
  await ensureAuthTables();

  const [rows] = await db().execute(
    "SELECT id, username, role FROM cms_admin_users WHERE username = ? AND password = ? AND is_active = 1 LIMIT 1",
    [username, password]
  );

  const userRow = Array.isArray(rows) ? (rows[0] as (RowDataPacket & CmsUser) | undefined) : undefined;
  if (!userRow) return null;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db().execute(
    "INSERT INTO cms_sessions (token, user_id, username, role, expires_at) VALUES (?, ?, ?, ?, ?)",
    [token, userRow.id, userRow.username, userRow.role, expiresAt.toISOString().slice(0, 19).replace("T", " ")]
  );

  return {
    token,
    user: {
      id: Number(userRow.id),
      username: String(userRow.username),
      role: String(userRow.role),
    },
  };
}

export async function getCmsUserFromCookieHeader(cookieHeader: string): Promise<CmsUser | null> {
  await ensureAuthTables();
  const token = parseCookieHeader(cookieHeader)[COOKIE_NAME];
  if (!token) return null;

  const [rows] = await db().execute(
    "SELECT token, user_id, username, role, expires_at FROM cms_sessions WHERE token = ? LIMIT 1",
    [token]
  );
  const row = Array.isArray(rows) ? (rows[0] as SessionRow | undefined) : undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db().execute("DELETE FROM cms_sessions WHERE token = ?", [token]);
    return null;
  }

  return mapSessionUser(row);
}

export async function logoutCmsSession(token: string): Promise<void> {
  if (!token) return;
  await ensureAuthTables();
  await db().execute("DELETE FROM cms_sessions WHERE token = ?", [token]);
}

export function extractSessionToken(cookieHeader: string): string {
  return parseCookieHeader(cookieHeader)[COOKIE_NAME] || "";
}
