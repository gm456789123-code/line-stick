import { NextResponse } from "next/server";

function backendApiBase(): string {
  return process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api";
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const form = await req.formData();
    const token = String(form.get("token") || "");
    const file = form.get("file");

    if (!token) {
      return NextResponse.json({ ok: false, error: "token is required" }, { status: 422 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 422 });
    }

    const body = new FormData();
    body.append("token", token);
    body.append("file", file);

    const res = await fetch(`${backendApiBase()}/public/orders/${encodeURIComponent(id)}/upload-slip`, {
      method: "POST",
      body,
      cache: "no-store",
    });

    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to upload slip" }, { status: 500 });
  }
}

