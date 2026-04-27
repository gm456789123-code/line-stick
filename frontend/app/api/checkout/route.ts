import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

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
    const response = await fetch(`${backendApiBase()}/public/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      data?: { orderId?: string; paymentToken?: string; status?: string; total?: number };
    };

    if (!response.ok || !data.ok || !data.data?.orderId || !data.data?.paymentToken) {
      return NextResponse.json(
        { ok: false, message: data.error || "Checkout failed." },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          orderId: data.data.orderId,
          paymentToken: data.data.paymentToken,
          status: data.data.status || "pending_payment",
          total: data.data.total || 0,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Checkout failed." }, { status: 500 });
  }
}
