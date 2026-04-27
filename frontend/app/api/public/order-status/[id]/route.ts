import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const res = await fetch(`${backendApiBase()}/public/order-status/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load order status" }, { status: 500 });
  }
}
