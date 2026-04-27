import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${backendApiBase()}/orders`, {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load orders" }, { status: 500 });
  }
}

