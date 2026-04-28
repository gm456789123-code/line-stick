export type CmsSummary = {
  totalStickers: number;
  activeStickers: number;
  draftStickers: number;
  todayOrders: number;
  todayRevenue: number;
  totalOrders: number;
  completedOrders: number;
  underReviewOrders: number;
  serverStatus: string;
  lastUpdatedAt: string;
};

export type CmsUser = {
  id: number;
  username: string;
  role: "superadmin" | "dev" | "admin" | "editor" | string;
};

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
};

export type CmsSiteSettings = {
  siteEnabled: boolean;
  siteTitle: string;
  siteDescription: string;
  tabIconUrl: string;
  tabPreviewImageUrl: string;
  maintenanceMessage: string;
};

const DEFAULT_SUMMARY: CmsSummary = {
  totalStickers: 0,
  activeStickers: 0,
  draftStickers: 0,
  todayOrders: 0,
  todayRevenue: 0,
  totalOrders: 0,
  completedOrders: 0,
  underReviewOrders: 0,
  serverStatus: "normal",
  lastUpdatedAt: new Date().toISOString(),
};

export type CmsOrder = {
  id: string;
  customer: {
    fullName: string;
    phone: string;
    lineId: string;
    note: string;
  };
  items: Array<{
    slug: string;
    name: string;
    price: number;
    qty: number;
    lineTotal?: number;
  }>;
  total: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

function getBackendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

type FetchOptions = {
  cookieHeader?: string;
};

async function fetchCmsJson<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  const url = `${getBackendApiBase()}${path}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: options.cookieHeader ? { cookie: options.cookieHeader } : undefined,
    });
    if (!res.ok) {
      return null;
    }

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getCmsSummary(options: FetchOptions = {}): Promise<CmsSummary> {
  const url = `${getBackendApiBase()}/dashboard/summary`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: options.cookieHeader ? { cookie: options.cookieHeader } : undefined,
    });
    if (!res.ok) {
      return DEFAULT_SUMMARY;
    }

    const json = (await res.json()) as { ok?: boolean; data?: Partial<CmsSummary> };
    if (!json?.ok || !json.data) {
      return DEFAULT_SUMMARY;
    }

    return {
      totalStickers: Number(json.data.totalStickers ?? 0),
      activeStickers: Number(json.data.activeStickers ?? 0),
      draftStickers: Number(json.data.draftStickers ?? 0),
      todayOrders: Number(json.data.todayOrders ?? 0),
      todayRevenue: Number(json.data.todayRevenue ?? 0),
      totalOrders: Number(json.data.totalOrders ?? 0),
      completedOrders: Number(json.data.completedOrders ?? 0),
      underReviewOrders: Number(json.data.underReviewOrders ?? 0),
      serverStatus: String(json.data.serverStatus ?? "normal"),
      lastUpdatedAt: String(json.data.lastUpdatedAt ?? DEFAULT_SUMMARY.lastUpdatedAt),
    };
  } catch {
    return DEFAULT_SUMMARY;
  }
}

export async function getCmsMe(options: FetchOptions = {}): Promise<CmsUser | null> {
  const json = await fetchCmsJson<{ ok?: boolean; data?: { user?: CmsUser } }>("/auth/me", options);
  if (!json?.ok || !json.data?.user) {
    return null;
  }

  return json.data.user;
}

export async function getCmsStickers(options: FetchOptions = {}): Promise<CmsSticker[]> {
  const json = await fetchCmsJson<{ ok?: boolean; data?: CmsSticker[] }>("/stickers", options);
  if (!json?.ok || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    slug: String(item.slug ?? "").trim() || (item.id ? `sticker-${String(item.id)}` : ""),
    price: Number(item.price ?? 0),
    count: Number(item.count ?? 0),
    status: String(item.status ?? "active"),
    coverImage: String(item.coverImage ?? ""),
    previewImages: Array.isArray(item.previewImages) ? item.previewImages.map(String) : [],
    createdAt: String(item.createdAt ?? ""),
  }));
}

export async function getCmsSiteSettings(options: FetchOptions = {}): Promise<CmsSiteSettings> {
  const fallback: CmsSiteSettings = {
    siteEnabled: true,
    siteTitle: "LINE Stick Store",
    siteDescription: "Modern LINE sticker storefront powered by Next.js.",
    tabIconUrl: "",
    tabPreviewImageUrl: "",
    maintenanceMessage: "เว็บไซต์กำลังปิดปรับปรุงชั่วคราว",
  };

  const json = await fetchCmsJson<{ ok?: boolean; data?: Partial<CmsSiteSettings> }>("/settings/site", options);
  if (!json?.ok || !json.data) {
    return fallback;
  }

  return {
    siteEnabled: Boolean(json.data.siteEnabled ?? fallback.siteEnabled),
    siteTitle: String(json.data.siteTitle ?? fallback.siteTitle),
    siteDescription: String(json.data.siteDescription ?? fallback.siteDescription),
    tabIconUrl: String(json.data.tabIconUrl ?? ""),
    tabPreviewImageUrl: String(json.data.tabPreviewImageUrl ?? ""),
    maintenanceMessage: String(json.data.maintenanceMessage ?? fallback.maintenanceMessage),
  };
}

export async function getCmsOrders(options: FetchOptions = {}): Promise<CmsOrder[]> {
  const json = await fetchCmsJson<{ ok?: boolean; data?: Array<Partial<CmsOrder> & { customerName?: string }> }>(
    "/orders",
    options
  );
  if (!json?.ok || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.map((row) => {
    const customerObj = (row.customer && typeof row.customer === "object" ? row.customer : {}) as any;
    return {
      id: String(row.id ?? ""),
      customer: {
        fullName: String(customerObj.fullName ?? row.customerName ?? "Guest"),
        phone: String(customerObj.phone ?? ""),
        lineId: String(customerObj.lineId ?? ""),
        note: String(customerObj.note ?? ""),
      },
      items: Array.isArray(row.items)
        ? row.items.map((item) => ({
            slug: String(item.slug ?? ""),
            name: String(item.name ?? ""),
            price: Number(item.price ?? 0),
            qty: Number(item.qty ?? 1),
            lineTotal: Number(item.lineTotal ?? Number(item.price ?? 0) * Number(item.qty ?? 1)),
          }))
        : [],
      total: Number(row.total ?? 0),
      status: String(row.status ?? "pending_payment"),
      createdAt: String(row.createdAt ?? ""),
      updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    };
  });
}
