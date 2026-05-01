import { NextResponse } from "next/server";
import { updateOrderStatus } from "../../../../../../lib/server/orders-repo";

type Ctx = {
  params: Promise<{ id: string }>;
};

const ALLOWED = new Set(["pending_payment", "under_review", "completed", "cancelled"]);

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { status?: string };
    const status = String(body.status ?? "").trim();

    if (!ALLOWED.has(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 422 });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update order status" }, { status: 500 });
  }
}
