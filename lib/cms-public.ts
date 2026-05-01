import { getSiteSettings, getStickerBySlug, listStickers } from "./server/cms-content-repo";

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

const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  siteEnabled: true,
  siteTitle: "LINE Stick Store",
  siteDescription: "Modern LINE sticker storefront powered by Next.js.",
  tabIconUrl: "",
  tabPreviewImageUrl: "",
  maintenanceMessage: "เว็บไซต์กำลังปิดปรับปรุงชั่วคราว",
};

function normalizeSticker(input: PublicSticker): PublicSticker {
  const cover = String(input.coverImage || "");
  const previews = Array.isArray(input.previewImages) ? input.previewImages.map(String) : [];
  return {
    ...input,
    coverImage: cover,
    previewImages: previews,
    count: previews.length,
  };
}

export async function getPublicStickers(): Promise<PublicSticker[]> {
  try {
    const stickers = await listStickers();
    return stickers.filter((item) => item.status === "active").map((item) => normalizeSticker(item));
  } catch {
    return [];
  }
}

export async function getPublicStickerBySlug(slug: string): Promise<PublicSticker | null> {
  try {
    const sticker = await getStickerBySlug(slug);
    if (!sticker || sticker.status !== "active") return null;
    return normalizeSticker(sticker);
  } catch {
    return null;
  }
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    return await getSiteSettings();
  } catch {
    return DEFAULT_PUBLIC_SETTINGS;
  }
}
