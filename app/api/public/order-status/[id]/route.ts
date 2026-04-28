import { NextResponse } from "next/server";
import { findOrderById } from "../../../../../lib/server/orders-repo";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const order = await findOrderById(id);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt ?? "",
          completedAt: order.completedAt ?? "",
          paymentSubmittedAt: order.paymentSubmittedAt ?? "",
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load order status" }, { status: 500 });
  }
}
