"use client";

import { useRouter } from "next/navigation";
import styles from "./payment-entry-popup.module.css";

type Props = {
  orderId: string;
};

export default function PaymentEntryPopup({ orderId }: Props) {
  const router = useRouter();

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="payment-entry-popup">
      <div className={styles.modal}>
        <p className={styles.kicker}>Payment Center</p>
        <h2 className={styles.title}>ยืนยันการชำระเงิน</h2>
        <p className={styles.order}>คำสั่งซื้อ #{orderId}</p>

        <button type="button" className="btn btn-success" onClick={() => router.push("/")}> 
          ตกลง
        </button>
      </div>
    </div>
  );
}
