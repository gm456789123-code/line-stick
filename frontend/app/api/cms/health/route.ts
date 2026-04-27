import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function GET() {
  try {
    const res = await fetch(`${backendApiBase()}/health`, {
      method: "GET",
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, status: "offline", error: "Backend API unavailable" },
      { status: 503 }
    );
  }
}
