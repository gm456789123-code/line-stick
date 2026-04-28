import { NextResponse } from "next/server";
import { findOrderById, markPaid } from "../../../../../../lib/server/orders-repo";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { token?: string };
    const token = String(body.token || "");
    if (!token) {
      return NextResponse.json({ ok: false, error: "token is required" }, { status: 422 });
    }

    const order = await findOrderById(id);
    if (!order || order.publicToken !== token) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }
    const updated = await markPaid(id);
    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to submit payment" }, { status: 500 });
  }
}
