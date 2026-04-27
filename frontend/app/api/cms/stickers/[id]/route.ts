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
    const res = await fetch(`${backendApiBase()}/stickers/${encodeURIComponent(id)}`, {
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
    return NextResponse.json({ ok: false, error: "Failed to update sticker" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${backendApiBase()}/stickers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete sticker" }, { status: 500 });
  }
}

