import { NextResponse } from "next/server";
import { findOrderById } from "../../../../../lib/server/orders-repo";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "token is required" }, { status: 422 });
    }

    const order = await findOrderById(id);
    if (!order || order.publicToken !== token) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: order }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load order" }, { status: 500 });
  }
}
