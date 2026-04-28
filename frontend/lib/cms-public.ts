export type PublicSticker = {
  id: string;
  name: string;
  slug: string;
  price: number;
  count: number;
  status: string;
  coverImage: string;
  previewImages: string[];
  createdAt: string;
};

export type PublicSiteSettings = {
  siteEnabled: boolean;
  siteTitle: string;
  siteDescription: string;
  tabIconUrl: string;
  tabPreviewImageUrl: string;
  maintenanceMessage: string;
};

function getBackendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

function getBackendOrigin(): string {
  try {
    return new URL(getBackendApiBase()).origin;
  } catch {
    return "";
  }
}

function resolveMediaUrl(value: string): string {
  const input = String(value || "").trim();
  if (!input) return "";
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  if (input.startsWith("/")) {
    const origin = getBackendOrigin();
    return origin ? `${origin}${input}` : input;
  }
  return input;
}

function normalizeSticker(input: Partial<PublicSticker>): PublicSticker {
  const id = String(input.id ?? "");
  const rawSlug = String(input.slug ?? "").trim();
  const slug = rawSlug || (id ? `sticker-${id}` : "");

  return {
    id,
    name: String(input.name ?? ""),
    slug,
    price: Number(input.price ?? 69),
    count: Number(input.count ?? 0),
    status: String(input.status ?? "active"),
    coverImage: resolveMediaUrl(String(input.coverImage ?? "")),
    previewImages: Array.isArray(input.previewImages) ? input.previewImages.map((item) => resolveMediaUrl(String(item))) : [],
    createdAt: String(input.createdAt ?? ""),
  };
}

export async function getPublicStickers(): Promise<PublicSticker[]> {
  try {
    const res = await fetch(`${getBackendApiBase()}/public/stickers`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as { ok?: boolean; data?: Partial<PublicSticker>[] };
    if (!json.ok || !Array.isArray(json.data)) {
      return [];
    }

    return json.data.map(normalizeSticker);
  } catch {
    return [];
  }
}

export async function getPublicStickerBySlug(slug: string): Promise<PublicSticker | null> {
  try {
    const res = await fetch(`${getBackendApiBase()}/public/stickers/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { ok?: boolean; data?: Partial<PublicSticker> };
    if (!json.ok || !json.data) {
      return null;
    }

    return normalizeSticker(json.data);
  } catch {
    return null;
  }
}

const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  siteEnabled: true,
  siteTitle: "LINE Stick Store",
  siteDescription: "Modern LINE sticker storefront powered by Next.js.",
  tabIconUrl: "",
  tabPreviewImageUrl: "",
  maintenanceMessage: "เว็บไซต์กำลังปิดปรับปรุงชั่วคราว",
};

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await fetch(`${getBackendApiBase()}/public/settings`, { cache: "no-store" });
    if (!res.ok) {
      return DEFAULT_SITE_SETTINGS;
    }

    const json = (await res.json()) as { ok?: boolean; data?: Partial<PublicSiteSettings> };
    if (!json.ok || !json.data) {
      return DEFAULT_SITE_SETTINGS;
    }

    const data = json.data;
    return {
      siteEnabled: Boolean(data.siteEnabled ?? DEFAULT_SITE_SETTINGS.siteEnabled),
      siteTitle: String(data.siteTitle ?? DEFAULT_SITE_SETTINGS.siteTitle),
      siteDescription: String(data.siteDescription ?? DEFAULT_SITE_SETTINGS.siteDescription),
      tabIconUrl: resolveMediaUrl(String(data.tabIconUrl ?? "")),
      tabPreviewImageUrl: resolveMediaUrl(String(data.tabPreviewImageUrl ?? "")),
      maintenanceMessage: String(data.maintenanceMessage ?? DEFAULT_SITE_SETTINGS.maintenanceMessage),
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
