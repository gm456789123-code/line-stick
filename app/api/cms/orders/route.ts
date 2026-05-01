import { NextResponse } from "next/server";
import { listOrders } from "../../../../lib/server/orders-repo";

export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json({ ok: true, data: orders }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load orders" }, { status: 500 });
  }
}
