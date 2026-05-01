import { NextResponse } from "next/server";
import { createOrder, type OrderItem } from "../../../lib/server/orders-repo";

type CheckoutPayload = {
  customer?: {
    fullName?: string;
    phone?: string;
    lineId?: string;
    note?: string;
  };
  items?: Array<{
    slug?: string;
    name?: string;
    price?: number;
    qty?: number;
    imageUrl?: string;
    emoji?: string;
  }>;
};

export async function POST(request: Request) {
  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  const fullName = payload.customer?.fullName?.trim() || "";
  const phone = payload.customer?.phone?.trim() || "";
  const lineId = payload.customer?.lineId?.trim() || "";
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!fullName || !phone || !lineId) {
    return NextResponse.json({ ok: false, message: "Missing customer fields." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ ok: false, message: "No order items." }, { status: 400 });
  }

  try {
    const normalizedItems: OrderItem[] = items.map((item) => {
      const price = Number(item.price ?? 0);
      const qty = Math.max(1, Number(item.qty ?? 1));
      return {
        slug: String(item.slug ?? ""),
        name: String(item.name ?? "Sticker"),
        price,
        qty,
        lineTotal: price * qty,
        imageUrl: String(item.imageUrl ?? ""),
        emoji: String(item.emoji ?? ""),
      };
    });

    const total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    const created = await createOrder({
      customer: {
        fullName,
        phone,
        lineId,
        note: String(payload.customer?.note ?? ""),
      },
      items: normalizedItems,
      total,
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          orderId: created.id,
          paymentToken: created.publicToken,
          status: created.status,
          total: created.total,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown server error";
    console.error("[checkout] failed:", error);
    return NextResponse.json({ ok: false, message: `Checkout failed: ${detail}` }, { status: 500 });
  }
}
