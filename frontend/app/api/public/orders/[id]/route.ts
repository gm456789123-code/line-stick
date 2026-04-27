import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

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

    const res = await fetch(
      `${backendApiBase()}/public/orders/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load order" }, { status: 500 });
  }
}

