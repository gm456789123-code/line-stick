import { NextResponse } from "next/server";
import { deleteSticker, updateSticker } from "../../../../../lib/server/cms-content-repo";
import { getCmsUserFromCookieHeader } from "../../../../../lib/server/cms-auth";

type Ctx = {
  params: Promise<{ id: string }>;
};

async function requireAuth(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return getCmsUserFromCookieHeader(cookieHeader);
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const me = await requireAuth(req);
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const data = await updateSticker(id, body);
    if (!data) return NextResponse.json({ ok: false, error: "Sticker not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update sticker" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const me = await requireAuth(req);
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const ok = await deleteSticker(id);
    if (!ok) return NextResponse.json({ ok: false, error: "Sticker not found" }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete sticker" }, { status: 500 });
  }
}
