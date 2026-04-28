"use client";

import * as React from "react";
import type { CmsUser } from "../../../lib/cms-api";

type PaymentSettings = {
  promptPayNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

type Props = {
  me: CmsUser;
  initialSettings: PaymentSettings;
};

export default function PaymentSettingsManager({ me, initialSettings }: Props) {
  const [settings, setSettings] = React.useState<PaymentSettings>(initialSettings);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/cms/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: PaymentSettings };
      if (!res.ok || !json.ok || !json.data) {
        setMessage(json.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setSettings(json.data);
      setMessage("บันทึกเรียบร้อยแล้ว");
    } catch {
      setMessage("เชื่อมต่อระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>ตั้งค่าบัญชี</h1>
      <p style={{ marginTop: 6, color: "#b6cce7" }}>
        ผู้ใช้: {me.username} ({me.role})
      </p>

      <form
        onSubmit={onSave}
        style={{
          background: "rgba(255,255,255,0.96)",
          color: "#1f2b39",
          borderRadius: 16,
          padding: 16,
          border: "1px solid #dbe5ef",
        }}
      >
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">เบอร์พร้อมเพย์</label>
            <input
              className="form-control"
              placeholder="0812345678"
              value={settings.promptPayNumber}
              onChange={(e) => setSettings((prev) => ({ ...prev, promptPayNumber: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">ธนาคาร</label>
            <input
              className="form-control"
              placeholder="เช่น กสิกรไทย"
              value={settings.bankName}
              onChange={(e) => setSettings((prev) => ({ ...prev, bankName: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">ชื่อบัญชี</label>
            <input
              className="form-control"
              placeholder="ชื่อ-นามสกุล"
              value={settings.bankAccountName}
              onChange={(e) => setSettings((prev) => ({ ...prev, bankAccountName: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">เลขบัญชี</label>
            <input
              className="form-control"
              placeholder="xxx-x-xxxxx-x"
              value={settings.bankAccountNumber}
              onChange={(e) => setSettings((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
            />
          </div>
        </div>

        {message ? (
          <p style={{ marginTop: 10, marginBottom: 0, color: message.includes("เรียบร้อย") ? "#0d8b39" : "#c03b3b" }}>
            {message}
          </p>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-success" disabled={loading} type="submit">
            {loading ? "กำลังบันทึก..." : "บันทึกบัญชี"}
          </button>
        </div>
      </form>
    </div>
  );
}
