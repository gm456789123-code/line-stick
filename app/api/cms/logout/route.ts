import { NextResponse } from "next/server";
import { extractSessionToken, getSessionCookieName, logoutCmsSession } from "../../../../lib/server/cms-auth";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = extractSessionToken(cookieHeader);
    if (token) {
      await logoutCmsSession(token);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set(getSessionCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Logout request failed" }, { status: 500 });
  }
}
