import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const cookie = req.headers.get("cookie") || "";
    const body = await req.json();

    const res = await fetch(`${backendApiBase()}/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update order status" }, { status: 500 });
  }
}

