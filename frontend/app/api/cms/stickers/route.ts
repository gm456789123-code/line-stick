import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${backendApiBase()}/stickers`, {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load stickers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const body = await req.json();
    const res = await fetch(`${backendApiBase()}/stickers`, {
      method: "POST",
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
    return NextResponse.json({ ok: false, error: "Failed to create sticker" }, { status: 500 });
  }
}
