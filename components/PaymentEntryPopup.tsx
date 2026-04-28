"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./payment-entry-popup.module.css";

type Props = {
  orderId: string;
};

const CART_STORAGE_KEY = "line_stick_cart_v1";
const CHECKOUT_DRAFT_KEY = "line_stick_checkout_draft_v1";
const POPUP_ACK_PREFIX = "line_stick_payment_popup_ack_";

export default function PaymentEntryPopup({ orderId }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    const ackKey = `${POPUP_ACK_PREFIX}${orderId}`;
    const alreadyAcked = sessionStorage.getItem(ackKey) === "1";
    return !alreadyAcked;
  });

  function handleClose() {
    if (typeof window !== "undefined") {
      const ackKey = `${POPUP_ACK_PREFIX}${orderId}`;
      sessionStorage.setItem(ackKey, "1");
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      sessionStorage.removeItem("line_stick_last_order_id");
      sessionStorage.removeItem("line_stick_last_order_token");
    }

    setVisible(false);
    router.replace("/");
    router.refresh();
  }

  if (!visible) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="payment-entry-popup">
      <div className={styles.modal}>
        <p className={styles.kicker}>Payment Center</p>
        <h2 className={styles.title}>?????????????????</h2>
        <p className={styles.order}>?????????? #{orderId}</p>

        <button type="button" className="btn btn-success" onClick={handleClose}>
          ????
        </button>
      </div>
    </div>
  );
}
