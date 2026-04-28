import { NextResponse } from "next/server";
import { db } from "../../../../lib/server/db";

export async function GET() {
  try {
    await db().query("SELECT 1");
    return NextResponse.json({ ok: true, db: "connected" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, db: "disconnected" }, { status: 503 });
  }
}
