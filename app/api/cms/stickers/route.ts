import { NextResponse } from "next/server";
import { createSticker, listStickers } from "../../../../lib/server/cms-content-repo";
import { getCmsUserFromCookieHeader } from "../../../../lib/server/cms-auth";

async function requireAuth(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return getCmsUserFromCookieHeader(cookieHeader);
}

export async function GET(req: Request) {
  try {
    const me = await requireAuth(req);
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const data = await listStickers();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load stickers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireAuth(req);
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const data = await createSticker(body);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to create sticker" }, { status: 500 });
  }
}
