import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

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

    const res = await fetch(`${backendApiBase()}/public/orders/${encodeURIComponent(id)}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to submit payment" }, { status: 500 });
  }
}

