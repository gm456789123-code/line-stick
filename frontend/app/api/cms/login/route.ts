import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const res = await fetch(`${backendApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(body.username || ""),
        password: String(body.password || ""),
      }),
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    const out = NextResponse.json(data, { status: res.status });
    const cookie = res.headers.get("set-cookie");
    if (cookie) {
      out.headers.set("set-cookie", cookie);
    }
    return out;
  } catch {
    return NextResponse.json({ ok: false, error: "Login request failed" }, { status: 500 });
  }
}
