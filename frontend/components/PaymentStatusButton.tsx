"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./payment-status-button.module.css";

type Props = {
  orderId: string;
  token: string;
  currentStatus: string;
};

export default function PaymentStatusButton({ orderId, token, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isLocked = loading || status === "under_review" || status === "completed";
  const slipPreviewUrl = useMemo(() => (slipFile ? URL.createObjectURL(slipFile) : ""), [slipFile]);

  useEffect(() => {
    return () => {
      if (slipPreviewUrl) {
        URL.revokeObjectURL(slipPreviewUrl);
      }
    };
  }, [slipPreviewUrl]);

  async function uploadSlip(file: File) {
    const form = new FormData();
    form.append("token", token);
    form.append("file", file);

    const res = await fetch(`/api/public/orders/${encodeURIComponent(orderId)}/upload-slip`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "อัปโหลดสลิปไม่สำเร็จ");
    }
  }

  async function submitPayment() {
    if (status === "under_review" || status === "completed") {
      setMessage("รายการนี้ถูกแจ้งชำระเงินแล้ว");
      return;
    }
    if (!slipFile) {
      setMessage("กรุณาอัปโหลดสลิปก่อนแจ้งชำระเงิน");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await uploadSlip(slipFile);

      const res = await fetch(`/api/public/orders/${encodeURIComponent(orderId)}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; data?: { status?: string } };
      if (!res.ok || !json.ok) {
        setMessage(json.error || "แจ้งชำระเงินไม่สำเร็จ");
        return;
      }

      setStatus(String(json.data?.status ?? "under_review"));
      setSlipFile(null);
      setMessage("ส่งสลิปเรียบร้อยแล้ว สถานะตอนนี้: กำลังตรวจสอบ");
    } catch {
      setMessage("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h4 className={styles.title}>อัปโหลดสลิปการโอนเงิน</h4>
        <span className={styles.tag}>รองรับ JPG, PNG, WEBP</span>
      </div>

      <label htmlFor="payment-slip-file" className={`${styles.dropzone} ${isLocked ? styles.locked : ""}`}>
        <div className={styles.icon}>↑</div>
        <strong className={styles.selectLabel}>{slipFile ? "เปลี่ยนไฟล์สลิป" : "คลิกเพื่อเลือกไฟล์สลิป"}</strong>
        <span className={styles.hint}>
          {slipFile ? slipFile.name : "แนบรูปสลิปให้ชัดเจนเพื่อให้แอดมินตรวจสอบได้เร็วขึ้น"}
        </span>
      </label>

      <input
        id="payment-slip-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
        disabled={isLocked}
        style={{ display: "none" }}
      />

      {slipPreviewUrl ? (
        <div className={styles.previewWrap}>
          <p className={styles.previewTitle}>ตัวอย่างสลิปก่อนส่ง</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slipPreviewUrl} alt="slip preview" className={styles.previewImage} />
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={submitPayment}
          className="btn btn-success"
          disabled={isLocked}
          style={{ paddingInline: 22, fontWeight: 700 }}
        >
          {loading ? "กำลังส่งข้อมูล..." : "ส่งสลิปและแจ้งชำระเงิน"}
        </button>
        <small className={styles.small}>หลังส่งแล้วสถานะจะเปลี่ยนเป็น &quot;กำลังตรวจสอบ&quot;</small>
      </div>

      {message ? <p className={`${styles.message} ${message.includes("เรียบร้อย") ? styles.ok : styles.error}`}>{message}</p> : null}
    </div>
  );
}
