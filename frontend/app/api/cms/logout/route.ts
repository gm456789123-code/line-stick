import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${backendApiBase()}/auth/logout`, {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    const out = NextResponse.json(data, { status: res.status });
    const responseCookie = res.headers.get("set-cookie");
    if (responseCookie) {
      out.headers.set("set-cookie", responseCookie);
    }
    return out;
  } catch {
    return NextResponse.json({ ok: false, error: "Logout request failed" }, { status: 500 });
  }
}
