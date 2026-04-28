import { NextResponse } from "next/server";
import { getPaymentSettings, upsertPaymentSettings } from "../../../../lib/server/payment-settings";

export async function GET() {
  try {
    const data = await getPaymentSettings();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load payment settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      promptPayNumber?: string;
      bankName?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
    };

    const data = await upsertPaymentSettings(body);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save payment settings" }, { status: 500 });
  }
}
