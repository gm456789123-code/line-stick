import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";

export type CmsSticker = {
  id: string;
  name: string;
  slug: string;
  price: number;
  count: number;
  status: string;
  coverImage: string;
  previewImages: string[];
  createdAt: string;
  updatedAt?: string;
};

export type CmsSiteSettings = {
  siteEnabled: boolean;
  siteTitle: string;
  siteDescription: string;
  tabIconUrl: string;
  tabPreviewImageUrl: string;
  maintenanceMessage: string;
};

let cmsContentInitPromise: Promise<void> | null = null;

const DEFAULT_SETTINGS: CmsSiteSettings = {
  siteEnabled: true,
  siteTitle: "LINE Stick Store",
  siteDescription: "Modern LINE sticker storefront powered by Next.js.",
  tabIconUrl: "",
  tabPreviewImageUrl: "",
  maintenanceMessage: "????????????????????????????????",
};

type StickerRow = RowDataPacket & {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  status: string;
  cover_image: string | null;
  preview_images_json: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function normalizeSlug(raw: string): string {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned;
}

function parseJsonArray(value: unknown): string[] {
  try {
    if (typeof value !== "string") return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "")).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mapStickerRow(row: StickerRow): CmsSticker {
  const previews = parseJsonArray(row.preview_images_json);
  return {
    id: String(row.id),
    name: String(row.name || ""),
    slug: String(row.slug || ""),
    price: Number(row.price || 0),
    count: previews.length,
    status: String(row.status || "active"),
    coverImage: String(row.cover_image || ""),
    previewImages: previews,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function ensureCmsContentTables(): Promise<void> {
  if (cmsContentInitPromise) {
    return cmsContentInitPromise;
  }

  cmsContentInitPromise = (async () => {
  await db().execute(`
    CREATE TABLE IF NOT EXISTS cms_site_settings (
      id TINYINT PRIMARY KEY,
      site_enabled TINYINT(1) NOT NULL DEFAULT 1,
      site_title VARCHAR(255) NOT NULL,
      site_description TEXT NOT NULL,
      tab_icon_url TEXT NULL,
      tab_preview_image_url TEXT NULL,
      maintenance_message TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db().execute(`
    CREATE TABLE IF NOT EXISTS cms_stickers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      price DECIMAL(10,2) NOT NULL DEFAULT 69,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      cover_image TEXT NULL,
      preview_images_json JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db().execute(
    `INSERT IGNORE INTO cms_site_settings
      (id, site_enabled, site_title, site_description, tab_icon_url, tab_preview_image_url, maintenance_message)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_SETTINGS.siteEnabled ? 1 : 0,
      DEFAULT_SETTINGS.siteTitle,
      DEFAULT_SETTINGS.siteDescription,
      DEFAULT_SETTINGS.tabIconUrl,
      DEFAULT_SETTINGS.tabPreviewImageUrl,
      DEFAULT_SETTINGS.maintenanceMessage,
    ]
  );
  })();

  try {
    await cmsContentInitPromise;
  } catch (error) {
    cmsContentInitPromise = null;
    throw error;
  }
}

export async function getSiteSettings(): Promise<CmsSiteSettings> {
  await ensureCmsContentTables();
  const [rows] = await db().execute(
    "SELECT site_enabled, site_title, site_description, tab_icon_url, tab_preview_image_url, maintenance_message FROM cms_site_settings WHERE id = 1 LIMIT 1"
  );
  const row = Array.isArray(rows) ? (rows[0] as RowDataPacket | undefined) : undefined;
  if (!row) return DEFAULT_SETTINGS;

  return {
    siteEnabled: Boolean(Number(row.site_enabled ?? 1)),
    siteTitle: String(row.site_title ?? DEFAULT_SETTINGS.siteTitle),
    siteDescription: String(row.site_description ?? DEFAULT_SETTINGS.siteDescription),
    tabIconUrl: String(row.tab_icon_url ?? ""),
    tabPreviewImageUrl: String(row.tab_preview_image_url ?? ""),
    maintenanceMessage: String(row.maintenance_message ?? DEFAULT_SETTINGS.maintenanceMessage),
  };
}

export async function saveSiteSettings(input: Partial<CmsSiteSettings>): Promise<CmsSiteSettings> {
  await ensureCmsContentTables();
  const current = await getSiteSettings();
  const next: CmsSiteSettings = {
    siteEnabled: input.siteEnabled ?? current.siteEnabled,
    siteTitle: String(input.siteTitle ?? current.siteTitle),
    siteDescription: String(input.siteDescription ?? current.siteDescription),
    tabIconUrl: String(input.tabIconUrl ?? current.tabIconUrl),
    tabPreviewImageUrl: String(input.tabPreviewImageUrl ?? current.tabPreviewImageUrl),
    maintenanceMessage: String(input.maintenanceMessage ?? current.maintenanceMessage),
  };

  await db().execute(
    `UPDATE cms_site_settings
     SET site_enabled = ?, site_title = ?, site_description = ?, tab_icon_url = ?, tab_preview_image_url = ?, maintenance_message = ?
     WHERE id = 1`,
    [
      next.siteEnabled ? 1 : 0,
      next.siteTitle,
      next.siteDescription,
      next.tabIconUrl,
      next.tabPreviewImageUrl,
      next.maintenanceMessage,
    ]
  );

  return next;
}

export async function listStickers(): Promise<CmsSticker[]> {
  await ensureCmsContentTables();
  const [rows] = await db().execute("SELECT * FROM cms_stickers ORDER BY created_at DESC");
  return Array.isArray(rows) ? (rows as StickerRow[]).map(mapStickerRow) : [];
}

export async function createSticker(input: Partial<CmsSticker>): Promise<CmsSticker> {
  await ensureCmsContentTables();
  const id = randomBytes(8).toString("hex");
  const slug = normalizeSlug(input.slug || input.name || id) || `sticker-${id}`;
  const previewImages = Array.isArray(input.previewImages) ? input.previewImages.map(String).filter(Boolean) : [];

  await db().execute(
    `INSERT INTO cms_stickers (id, name, slug, price, status, cover_image, preview_images_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      String(input.name || "Sticker"),
      slug,
      Number(input.price ?? 69),
      String(input.status || "active"),
      String(input.coverImage || ""),
      JSON.stringify(previewImages),
    ]
  );

  const [rows] = await db().execute("SELECT * FROM cms_stickers WHERE id = ? LIMIT 1", [id]);
  return mapStickerRow((rows as StickerRow[])[0]);
}

export async function updateSticker(id: string, input: Partial<CmsSticker>): Promise<CmsSticker | null> {
  await ensureCmsContentTables();
  const slug = normalizeSlug(String(input.slug || ""));
  const previewImages = Array.isArray(input.previewImages) ? input.previewImages.map(String).filter(Boolean) : [];

  await db().execute(
    `UPDATE cms_stickers
     SET name = ?, slug = ?, price = ?, status = ?, cover_image = ?, preview_images_json = ?
     WHERE id = ?`,
    [
      String(input.name || "Sticker"),
      slug || `sticker-${id}`,
      Number(input.price ?? 69),
      String(input.status || "active"),
      String(input.coverImage || ""),
      JSON.stringify(previewImages),
      id,
    ]
  );

  const [rows] = await db().execute("SELECT * FROM cms_stickers WHERE id = ? LIMIT 1", [id]);
  const row = Array.isArray(rows) ? (rows[0] as StickerRow | undefined) : undefined;
  return row ? mapStickerRow(row) : null;
}

export async function deleteSticker(id: string): Promise<boolean> {
  await ensureCmsContentTables();
  const [result] = await db().execute("DELETE FROM cms_stickers WHERE id = ?", [id]);
  return Number((result as { affectedRows?: number }).affectedRows || 0) > 0;
}

export async function getStickerBySlug(slug: string): Promise<CmsSticker | null> {
  await ensureCmsContentTables();
  const [rows] = await db().execute("SELECT * FROM cms_stickers WHERE slug = ? LIMIT 1", [slug]);
  const row = Array.isArray(rows) ? (rows[0] as StickerRow | undefined) : undefined;
  return row ? mapStickerRow(row) : null;
}
