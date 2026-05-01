import { NextResponse } from "next/server";
import { getCmsUserFromCookieHeader } from "../../../../lib/server/cms-auth";
import { getSiteSettings, saveSiteSettings } from "../../../../lib/server/cms-content-repo";

async function requireAuth(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return getCmsUserFromCookieHeader(cookieHeader);
}

export async function GET(req: Request) {
  try {
    const me = await requireAuth(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getSiteSettings();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireAuth(req);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = await saveSiteSettings(body as Record<string, unknown>);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 });
  }
}
