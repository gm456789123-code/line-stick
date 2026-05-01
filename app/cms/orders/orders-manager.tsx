"use client";

import * as React from "react";
import type { CmsOrder, CmsUser } from "../../../lib/cms-api";

type Props = {
  me: CmsUser;
  initialOrders: CmsOrder[];
};

const STATUS_OPTIONS = [
  { value: "pending_payment", label: "รอชำระเงิน" },
  { value: "under_review", label: "กำลังตรวจสอบ" },
  { value: "completed", label: "สำเร็จแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

type StatusTone = {
  text: string;
  bg: string;
  border: string;
};

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function statusTone(status: string): StatusTone {
  switch (status) {
    case "pending_payment":
      return { text: "#9a6700", bg: "#fff7e0", border: "#f4dfac" };
    case "under_review":
      return { text: "#0f4ba8", bg: "#eaf3ff", border: "#cfe0ff" };
    case "completed":
      return { text: "#1f7a3a", bg: "#e7f9ee", border: "#c8ebd5" };
    case "cancelled":
      return { text: "#b42318", bg: "#ffeeee", border: "#f8cccc" };
    default:
      return { text: "#334155", bg: "#f1f5f9", border: "#dce5ef" };
  }
}

export default function CmsOrdersManager({ me, initialOrders }: Props) {
  const [orders, setOrders] = React.useState<CmsOrder[]>(initialOrders);
  const [loadingId, setLoadingId] = React.useState<string>("");
  const [message, setMessage] = React.useState("");

  async function refreshList() {
    const res = await fetch("/api/cms/orders", { method: "GET", cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: CmsOrder[] };
    if (res.ok && json.ok && Array.isArray(json.data)) {
      setOrders(json.data);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setLoadingId(orderId);
    setMessage("");
    try {
      const res = await fetch(`/api/cms/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }
      setMessage("อัปเดตสถานะเรียบร้อยแล้ว");
      await refreshList();
    } catch {
      setMessage("เชื่อมต่อระบบไม่สำเร็จ");
    } finally {
      setLoadingId("");
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 style={{ marginTop: 0 }}>คำสั่งซื้อ</h1>
      <p style={{ marginTop: 6, color: "#b8cde7" }}>
        ผู้ใช้: {me.username} ({me.role})
      </p>

      {message ? (
        <p style={{ marginTop: 6, color: message.includes("เรียบร้อย") ? "#59d893" : "#ff9c9c" }}>{message}</p>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((order) => {
          const tone = statusTone(order.status);

          return (
            <article
              key={order.id}
              style={{
                background: "rgba(255,255,255,0.97)",
                borderRadius: 14,
                border: `1px solid ${tone.border}`,
                padding: 14,
                color: "#1b2a39",
                boxShadow: "0 8px 20px rgba(16,24,40,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: 18, margin: 0 }}>Order #{order.id}</h2>
                  <p style={{ margin: "6px 0 0", color: "#47617b" }}>
                    {order.customer.fullName} • {order.customer.phone} • LINE: {order.customer.lineId}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: 999,
                        padding: "4px 10px",
                        background: tone.bg,
                        border: `1px solid ${tone.border}`,
                        color: tone.text,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </div>

                <div style={{ minWidth: 240 }}>
                  <label className="form-label" style={{ marginBottom: 6 }}>
                    เปลี่ยนสถานะ
                  </label>
                  <select
                    className="form-select"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    disabled={loadingId === order.id}
                    style={{
                      borderColor: tone.border,
                      backgroundColor: tone.bg,
                      color: tone.text,
                      fontWeight: 700,
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {loadingId === order.id ? (
                    <small style={{ color: "#527089", display: "block", marginTop: 6 }}>กำลังอัปเดตสถานะ...</small>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {order.items.map((item, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5ebf1",
                    }}
                  >
                    <span>
                      {item.name} ({item.qty} x {item.price} THB)
                    </span>
                    <strong>{item.lineTotal ?? item.price * item.qty} THB</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", color: "#2d4358", gap: 8 }}>
                <span>โน้ตลูกค้า: {order.customer.note || "-"}</span>
                <strong>รวม {order.total} THB</strong>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
