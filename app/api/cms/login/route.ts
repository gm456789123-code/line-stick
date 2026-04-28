import { NextResponse } from "next/server";
import { getSessionCookieName, loginCmsUser } from "../../../../lib/server/cms-auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "username and password are required" }, { status: 422 });
    }

    const result = await loginCmsUser(username, password);
    if (!result) {
      return NextResponse.json({ ok: false, error: "invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, data: { user: result.user } }, { status: 200 });
    res.cookies.set(getSessionCookieName(), result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Login request failed" }, { status: 500 });
  }
}
