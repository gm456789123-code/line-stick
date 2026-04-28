import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { attachSlip, findOrderById } from "../../../../../../lib/server/orders-repo";

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
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Only jpg, png, webp allowed" }, { status: 422 });
    }

    const order = await findOrderById(id);
    if (!order || order.publicToken !== token) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `slip-${id}-${randomBytes(6).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "slips");
    await mkdir(uploadDir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), bytes);

    const publicUrl = `/uploads/slips/${filename}`;
    await attachSlip(id, publicUrl);
    return NextResponse.json({ ok: true, data: { orderId: id, paymentSlipImage: publicUrl } }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to upload slip" }, { status: 500 });
  }
}
