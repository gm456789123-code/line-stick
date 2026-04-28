const DEFAULT_WP_BASE_URL = "http://localhost/line-stick/backend";

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, "");
}

export function getWordPressBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WP_BASE_URL?.trim();
  return normalizeBaseUrl(fromEnv || DEFAULT_WP_BASE_URL);
}

export async function fetchWpJson<T>(path: string): Promise<T> {
  return fetchWpJsonWithOptions<T>(path);
}

export async function fetchWpJsonWithOptions<T>(
  path: string,
  options?: { revalidate?: number; noStore?: boolean }
): Promise<T> {
  const baseUrl = getWordPressBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}/wp-json${normalizedPath}`;

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
    headers: { Accept: "application/json" },
  };

  if (options?.noStore) {
    fetchOptions.cache = "no-store";
  } else {
    fetchOptions.next = { revalidate: options?.revalidate ?? 60 };
  }

  const response = await fetch(url, {
    ...fetchOptions,
  });

  if (!response.ok) {
    throw new Error(`WordPress request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export type WpRendered = {
  rendered: string;
};

export type WpPost = {
  id: number;
  slug: string;
  link: string;
  date: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
};

export type WpEmbeddedMedia = {
  id?: number;
  source_url?: string;
};

export type WpMediaItem = {
  id: number;
  source_url: string;
};

export type WpSticker = {
  id: number;
  slug: string;
  link: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
  meta?: {
    sticker_price?: number | string;
    sticker_count?: number | string;
    sticker_badge?: string;
    sticker_emoji?: string;
    sticker_preview_images?: string;
    sticker_cover_image?: string;
  };
  _embedded?: {
    "wp:featuredmedia"?: WpEmbeddedMedia[];
  };
};

export type WpPage = {
  id: number;
  slug: string;
  link: string;
  date: string;
  title: WpRendered;
  content: WpRendered;
};

export type WpSiteInfo = {
  name?: string;
  description?: string;
  url?: string;
  home?: string;
};

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const imgTagPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match = imgTagPattern.exec(html);

  while (match) {
    const src = match[1]?.trim();
    if (src) {
      urls.push(src);
    }
    match = imgTagPattern.exec(html);
  }

  return Array.from(new Set(urls));
}

export function parsePreviewImageUrls(rawValue: unknown): string[] {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return [];
  }

  const trimmed = rawValue.trim();
  let lines: string[] = [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        lines = parsed.map((item) => String(item ?? "").trim());
      }
    } catch {
      lines = [];
    }
  }

  if (lines.length === 0) {
    lines = trimmed
      .split(/\r?\n|,/g)
      .map((item) => item.trim());
  }

  const isValidUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith("/");
  return Array.from(new Set(lines.filter((line) => line !== "" && isValidUrl(line))));
}

export function formatWpDate(input: string): string {
  return new Date(input).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function getSiteInfo(): Promise<WpSiteInfo> {
  return fetchWpJson<WpSiteInfo>("/");
}

export async function getRecentPosts(limit = 6): Promise<WpPost[]> {
  return fetchWpJson<WpPost[]>(`/wp/v2/posts?per_page=${limit}&_embed=1`);
}

export async function getStickers(limit = 12): Promise<WpSticker[]> {
  return fetchWpJsonWithOptions<WpSticker[]>(`/wp/v2/stickers?per_page=${limit}&status=publish&_embed=1`, {
    noStore: true,
  });
}

export async function getStickersBySlug(slug: string): Promise<WpSticker[]> {
  return fetchWpJsonWithOptions<WpSticker[]>(
    `/wp/v2/stickers?slug=${encodeURIComponent(slug)}&status=publish&_embed=1`,
    {
      noStore: true,
    }
  );
}

export async function getMediaByParentId(parentId: number, limit = 50): Promise<WpMediaItem[]> {
  return fetchWpJsonWithOptions<WpMediaItem[]>(
    `/wp/v2/media?parent=${parentId}&per_page=${limit}&orderby=date&order=asc`,
    {
      noStore: true,
    }
  );
}

export async function getPostsBySlug(slug: string): Promise<WpPost[]> {
  return fetchWpJson<WpPost[]>(`/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`);
}

export async function getPostBySlug(slug: string): Promise<WpPost | null> {
  const posts = await getPostsBySlug(slug);
  return posts[0] ?? null;
}

export async function getPages(limit = 20): Promise<WpPage[]> {
  return fetchWpJson<WpPage[]>(`/wp/v2/pages?per_page=${limit}&orderby=menu_order&order=asc`);
}

export async function getPagesBySlug(slug: string): Promise<WpPage[]> {
  return fetchWpJson<WpPage[]>(`/wp/v2/pages?slug=${encodeURIComponent(slug)}`);
}

export async function getPageBySlug(slug: string): Promise<WpPage | null> {
  const pages = await getPagesBySlug(slug);
  return pages[0] ?? null;
}
