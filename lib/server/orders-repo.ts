import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { db, ensureOrdersTable } from "./db";

export type OrderCustomer = {
  fullName: string;
  phone: string;
  lineId: string;
  note: string;
};

export type OrderItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  imageUrl?: string;
  emoji?: string;
};

export type OrderRecord = {
  id: string;
  publicToken: string;
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  status: string;
  paymentSlipImage?: string;
  paymentSubmittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function orderId(): string {
  return randomBytes(8).toString("hex");
}

function token(): string {
  return randomBytes(16).toString("hex");
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    if (typeof value !== "string") return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type OrderRow = RowDataPacket & {
  id: string;
  public_token: string | null;
  customer_json: string;
  items_json: string;
  total: number | string;
  status: string;
  payment_slip_image: string | null;
  payment_submitted_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
};

function mapRow(row: OrderRow): OrderRecord {
  return {
    id: String(row.id),
    publicToken: String(row.public_token ?? ""),
    customer: parseJson<OrderCustomer>(row.customer_json, {
      fullName: "",
      phone: "",
      lineId: "",
      note: "",
    }),
    items: parseJson<OrderItem[]>(row.items_json, []),
    total: Number(row.total ?? 0),
    status: String(row.status ?? "pending_payment"),
    paymentSlipImage: row.payment_slip_image ? String(row.payment_slip_image) : undefined,
    paymentSubmittedAt: row.payment_submitted_at ? new Date(row.payment_submitted_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function createOrder(input: { customer: OrderCustomer; items: OrderItem[]; total: number }): Promise<OrderRecord> {
  await ensureOrdersTable();
  const id = orderId();
  const publicToken = token();
  const createdAt = nowIso();

  await db().execute(
    `INSERT INTO cms_orders
      (id, public_token, customer_json, items_json, total, status, created_at, updated_at)
     VALUES
      (?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
    [id, publicToken, JSON.stringify(input.customer), JSON.stringify(input.items), input.total, createdAt, createdAt]
  );

  return {
    id,
    publicToken,
    customer: input.customer,
    items: input.items,
    total: input.total,
    status: "pending_payment",
    createdAt,
    updatedAt: createdAt,
  };
}

export async function findOrderById(id: string): Promise<OrderRecord | null> {
  await ensureOrdersTable();
  const [rows] = await db().execute("SELECT * FROM cms_orders WHERE id = ? LIMIT 1", [id]);
  const row = Array.isArray(rows) ? (rows[0] as OrderRow | undefined) : undefined;
  return row ? mapRow(row) : null;
}

export async function listOrders(): Promise<OrderRecord[]> {
  await ensureOrdersTable();
  const [rows] = await db().execute("SELECT * FROM cms_orders ORDER BY created_at DESC, id DESC");
  return Array.isArray(rows) ? (rows as OrderRow[]).map((row) => mapRow(row)) : [];
}

export async function updateOrderStatus(id: string, status: string): Promise<OrderRecord | null> {
  await ensureOrdersTable();
  const updatedAt = nowIso();
  const completedAt = status === "completed" ? updatedAt : null;
  await db().execute(
    "UPDATE cms_orders SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?",
    [status, updatedAt, completedAt, id]
  );
  return findOrderById(id);
}

export async function markPaid(id: string): Promise<OrderRecord | null> {
  await ensureOrdersTable();
  const updatedAt = nowIso();
  await db().execute(
    "UPDATE cms_orders SET status = 'under_review', payment_submitted_at = ?, updated_at = ? WHERE id = ?",
    [updatedAt, updatedAt, id]
  );
  return findOrderById(id);
}

export async function attachSlip(id: string, slipImageUrl: string): Promise<OrderRecord | null> {
  await ensureOrdersTable();
  const updatedAt = nowIso();
  await db().execute("UPDATE cms_orders SET payment_slip_image = ?, updated_at = ? WHERE id = ?", [slipImageUrl, updatedAt, id]);
  return findOrderById(id);
}
