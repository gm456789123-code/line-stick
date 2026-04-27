import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 422 });
    }

    const body = new FormData();
    body.append("file", file);

    const res = await fetch(`${backendApiBase()}/upload`, {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body,
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to upload file" }, { status: 500 });
  }
}
