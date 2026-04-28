import { getCmsUserFromCookieHeader, type CmsUser } from "./server/cms-auth";
import {
  getSiteSettings,
  listStickers,
  type CmsSiteSettings,
  type CmsSticker,
} from "./server/cms-content-repo";
import { listOrders, type OrderRecord } from "./server/orders-repo";

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

export type { CmsUser, CmsSticker, CmsSiteSettings };

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

type FetchOptions = {
  cookieHeader?: string;
};

function sameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function mapOrder(order: OrderRecord): CmsOrder {
  return {
    id: order.id,
    customer: order.customer,
    items: order.items,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getCmsSummary(): Promise<CmsSummary> {
  const [stickers, orders] = await Promise.all([listStickers(), listOrders()]);
  const now = new Date();

  const todayOrders = orders.filter((order) => sameDay(new Date(order.createdAt), now));

  return {
    totalStickers: stickers.length,
    activeStickers: stickers.filter((item) => item.status === "active").length,
    draftStickers: stickers.filter((item) => item.status !== "active").length,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    totalOrders: orders.length,
    completedOrders: orders.filter((order) => order.status === "completed").length,
    underReviewOrders: orders.filter((order) => order.status === "under_review").length,
    serverStatus: "normal",
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function getCmsMe(options: FetchOptions = {}): Promise<CmsUser | null> {
  try {
    return await getCmsUserFromCookieHeader(String(options.cookieHeader || ""));
  } catch {
    return null;
  }
}

export async function getCmsStickers(): Promise<CmsSticker[]> {
  return listStickers();
}

export async function getCmsSiteSettings(): Promise<CmsSiteSettings> {
  return getSiteSettings();
}

export async function getCmsOrders(): Promise<CmsOrder[]> {
  const orders = await listOrders();
  return orders.map(mapOrder);
}
