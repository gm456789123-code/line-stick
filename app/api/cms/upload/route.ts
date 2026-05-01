import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getCmsUserFromCookieHeader } from "../../../../lib/server/cms-auth";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const me = await getCmsUserFromCookieHeader(cookieHeader);
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 422 });
    }

    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Only image files are allowed" }, { status: 422 });
    }

    const ext = file.type.split("/")[1] || "jpg";
    const filename = `${randomBytes(8).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "stickers");
    await mkdir(uploadDir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({ ok: true, data: { url: `/uploads/stickers/${filename}` } }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to upload file" }, { status: 500 });
  }
}
