"use client";

import * as React from "react";
import type { CmsSiteSettings, CmsUser } from "../../../lib/cms-api";

type Props = {
  me: CmsUser;
  initialSettings: CmsSiteSettings;
};

export default function CmsSettingsManager({ me, initialSettings }: Props) {
  const [settings, setSettings] = React.useState<CmsSiteSettings>(initialSettings);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/cms/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: CmsSiteSettings };
      if (!res.ok || !json.ok || !json.data) {
        setMessage(json.error || "บันทึกการตั้งค่าไม่สำเร็จ");
        return;
      }
      setSettings(json.data);
      setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch {
      setMessage("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>ตั้งค่าเว็บไซต์</h1>
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
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="siteEnabled"
            checked={settings.siteEnabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, siteEnabled: e.target.checked }))}
          />
          <label className="form-check-label" htmlFor="siteEnabled">
            เปิดใช้งานเว็บไซต์ (ปิดแล้วหน้าร้านจะขึ้นข้อความปิดปรับปรุง)
          </label>
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">ชื่อเว็บไซต์ (Title)</label>
            <input
              className="form-control"
              value={settings.siteTitle}
              onChange={(e) => setSettings((prev) => ({ ...prev, siteTitle: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">คำอธิบายเว็บไซต์ (Description)</label>
            <input
              className="form-control"
              value={settings.siteDescription}
              onChange={(e) => setSettings((prev) => ({ ...prev, siteDescription: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">URL ไอคอนแท็บเว็บ (Favicon URL)</label>
            <input
              className="form-control"
              placeholder="https://.../favicon.png"
              value={settings.tabIconUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, tabIconUrl: e.target.value }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">URL รูปพรีวิวแท็บ/แชร์ลิงก์</label>
            <input
              className="form-control"
              placeholder="https://.../preview.jpg"
              value={settings.tabPreviewImageUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, tabPreviewImageUrl: e.target.value }))}
            />
          </div>
          <div className="col-12">
            <label className="form-label">ข้อความตอนปิดเว็บไซต์</label>
            <textarea
              className="form-control"
              rows={3}
              value={settings.maintenanceMessage}
              onChange={(e) => setSettings((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
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
            {loading ? "กำลังบันทึก..." : "บันทึก Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
