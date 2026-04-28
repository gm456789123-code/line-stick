"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

export type StickerItem = {
  slug: string;
  name: string;
  count: number;
  price: number;
  tag: string;
  emoji: string;
  imageUrl: string;
};

type CartRow = {
  item: StickerItem;
  qty: number;
};

type Props = {
  stickers: StickerItem[];
  initialCartOpen?: boolean;
};

type CheckoutForm = {
  fullName: string;
  phone: string;
  lineId: string;
  note: string;
};

type OrderStatusData = {
  id: string;
  status: string;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  paymentSubmittedAt?: string;
};

const CART_STORAGE_KEY = "line_stick_cart_v1";
const CHECKOUT_DRAFT_KEY = "line_stick_checkout_draft_v1";

function loadInitialCart(): Record<string, CartRow> {
  if (typeof window === "undefined") return {};
  try {
    const cartRaw = localStorage.getItem(CART_STORAGE_KEY);
    if (!cartRaw) return {};
    const parsed = JSON.parse(cartRaw) as Record<string, CartRow>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadInitialCheckoutDraft(): CheckoutForm {
  const emptyDraft: CheckoutForm = { fullName: "", phone: "", lineId: "", note: "" };
  if (typeof window === "undefined") return emptyDraft;
  try {
    const draftRaw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!draftRaw) return emptyDraft;
    const parsed = JSON.parse(draftRaw) as CheckoutForm;
    if (!parsed || typeof parsed !== "object") return emptyDraft;
    return {
      fullName: parsed.fullName || "",
      phone: parsed.phone || "",
      lineId: parsed.lineId || "",
      note: parsed.note || "",
    };
  } catch {
    return emptyDraft;
  }
}

export default function StickerShopClient({ stickers, initialCartOpen = false }: Props) {
  const [cart, setCart] = useState<Record<string, CartRow>>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(initialCartOpen);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(loadInitialCheckoutDraft);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusBillNo, setStatusBillNo] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusResult, setStatusResult] = useState<OrderStatusData | null>(null);

  const totalQty = useMemo(
    () => Object.values(cart).reduce((sum, row) => sum + row.qty, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => Object.values(cart).reduce((sum, row) => sum + row.qty * row.item.price, 0),
    [cart]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(checkoutForm));
  }, [checkoutForm]);

  function addToCart(item: StickerItem) {
    setCart((prev) => {
      const existing = prev[item.slug];
      return {
        ...prev,
        [item.slug]: {
          item,
          qty: existing ? existing.qty + 1 : 1,
        },
      };
    });
  }

  function removeOne(slug: string) {
    setCart((prev) => {
      const existing = prev[slug];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return {
        ...prev,
        [slug]: { ...existing, qty: existing.qty - 1 },
      };
    });
  }

  function clearCart() {
    setCart({});
  }

  function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutMessage("");

    if (Object.keys(cart).length === 0) {
      setCheckoutMessage("????????????????????????????");
      return;
    }

    if (!checkoutForm.fullName.trim() || !checkoutForm.phone.trim() || !checkoutForm.lineId.trim()) {
      setCheckoutMessage("???????? ???????? ??? LINE ID ??????????????????????????");
      return;
    }

    const orderPayload = {
      customer: checkoutForm,
      items: Object.values(cart).map((row) => ({
        slug: row.item.slug,
        name: row.item.name,
        price: row.item.price,
        qty: row.qty,
        imageUrl: row.item.imageUrl,
        emoji: row.item.emoji,
      })),
    };

    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: {
            orderId?: string;
            paymentToken?: string;
          };
        };

        if (!response.ok || !data.ok || !data.data?.orderId || !data.data?.paymentToken) {
          const message = data?.message || "??????????????????????";
          throw new Error(message);
        }

        const orderId = data.data.orderId;
        const paymentToken = data.data.paymentToken;
        setCart({});
        setCheckoutMessage(`??????????????????? (#${orderId}) ?????????????????????...`);
        window.location.href = `/payment?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(paymentToken)}`;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "??????????????????????????????????";
        setCheckoutMessage(message);
      });
  }

  function orderStatusLabel(status: string): string {
    switch (String(status || "").toLowerCase()) {
      case "pending_payment":
        return "รอชำระเงิน";
      case "under_review":
        return "กำลังตรวจสอบ";
      case "completed":
        return "สำเร็จแล้ว";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status || "-";
    }
  }

  function orderStatusBadgeStyle(status: string): { background: string; border: string; color: string } {
    switch (String(status || "").toLowerCase()) {
      case "pending_payment":
        return { background: "#fff7e6", border: "1px solid #fde7b3", color: "#a16207" };
      case "under_review":
        return { background: "#eaf4ff", border: "1px solid #cfe5ff", color: "#1d4ed8" };
      case "completed":
        return { background: "#e9fbe9", border: "1px solid #ccefd0", color: "#15803d" };
      case "cancelled":
        return { background: "#ffecec", border: "1px solid #ffd1d1", color: "#b91c1c" };
      default:
        return { background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#334155" };
    }
  }

  function openStatusPopup() {
    setIsStatusOpen(true);
    setStatusError("");
    setStatusResult(null);
  }

  function closeStatusPopup() {
    setIsStatusOpen(false);
    setStatusLoading(false);
  }

  async function handleOrderStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const billNo = statusBillNo.trim();
    if (!billNo) {
      setStatusError("กรุณากรอกเลขบิลก่อน");
      setStatusResult(null);
      return;
    }

    setStatusLoading(true);
    setStatusError("");
    setStatusResult(null);

    try {
      const response = await fetch(`/api/public/order-status/${encodeURIComponent(billNo)}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as { ok?: boolean; error?: string; data?: OrderStatusData };
      if (!response.ok || !json.ok || !json.data) {
        setStatusError(json.error || "ไม่พบข้อมูลบิลนี้");
        return;
      }
      setStatusResult(json.data);
    } catch {
      setStatusError("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div style={{ background: "#F8F4ED", minHeight: "100vh", fontFamily: "'Noto Sans Thai', 'Poppins', sans-serif" }}>
      <nav
        style={{
          background: "linear-gradient(90deg, #006600 0%, #00C300 100%)",
          boxShadow: "0 4px 24px rgba(0,100,0,0.18)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <div className="container py-2">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2 me-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                🐻
              </div>
              <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>StickerLine</span>
            </div>

            <div className="flex-grow-1 position-relative" style={{ maxWidth: 480 }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#999" }}>🔍</span>
              <input
                type="text"
                placeholder="Search stickers..."
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 50,
                  padding: "10px 20px 10px 44px",
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(255,255,255,0.18)",
                  color: "white",
                }}
              />
            </div>

            <div className="ms-auto d-flex align-items-center gap-2">
              <button
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  color: "white",
                }}
              >
                ♡
              </button>
              <button
                type="button"
                onClick={openStatusPopup}
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1.5px solid rgba(255,255,255,0.32)",
                  borderRadius: 50,
                  padding: "8px 14px",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                เช็คสถานะ
              </button>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: 50,
                  padding: "8px 18px",
                  color: "#00C300",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                🛒 รถเขน{" "}
                <span suppressHydrationWarning>{totalQty > 0 ? `(${totalQty})` : ""}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section
        style={{
          background: "linear-gradient(135deg, #004d00 0%, #007800 40%, #00C300 100%)",
          padding: "64px 0 80px",
        }}
      >
        <div className="container text-center">
          <h1 style={{ color: "white", fontWeight: 800, fontSize: "clamp(28px, 5vw, 52px)", marginBottom: 12 }}>
            Premium LINE Sticker Packs
            <br />
            For Chat, Brand, And Everyday Fun
          </h1>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 17, marginBottom: 28 }}>
            Discover curated sticker packs, check preview quality, and order in minutes.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button
              style={{
                background: "white",
                color: "#006600",
                border: "none",
                borderRadius: 50,
                padding: "14px 36px",
                fontWeight: 700,
              }}
            >
              Shop Now
            </button>
            <Link
              href="/cms/login"
              style={{
                background: "transparent",
                color: "white",
                border: "2px solid rgba(255,255,255,0.5)",
                borderRadius: 50,
                padding: "14px 36px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Partner / Admin →
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h2 style={{ fontWeight: 800, color: "#2C2C2C", marginBottom: 4, fontSize: 22 }}>Recommended Sticker Packs</h2>
            <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Updated packs ready for customers today</p>
          </div>
          <Link href="/" style={{ color: "#00C300", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
            Browse all →
          </Link>
        </div>

        <div className="row g-4">
          {stickers.map((sticker) => (
            <div key={sticker.slug} className="col-xl-3 col-lg-4 col-md-4 col-6">
              <div
                style={{
                  background: "white",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1.5px solid #EDE4D4",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ background: "linear-gradient(135deg, #FFF9F0 0%, #F0FFF0 100%)", padding: 24, textAlign: "center" }}>
                  {sticker.tag ? (
                    <span
                      style={{
                        display: "inline-block",
                        marginBottom: 10,
                        background: "#00C300",
                        color: "white",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 10px",
                      }}
                    >
                      {sticker.tag}
                    </span>
                  ) : null}
                  {sticker.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      style={{
                        width: 130,
                        maxWidth: "100%",
                        height: 130,
                        objectFit: "cover",
                        borderRadius: 16,
                        display: "block",
                        margin: "0 auto",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 72, lineHeight: 1 }}>{sticker.emoji}</div>
                  )}
                </div>

                <div style={{ padding: "14px 16px 16px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <h5 style={{ fontWeight: 700, fontSize: 14, color: "#2C2C2C", marginBottom: 4 }}>{sticker.name}</h5>
                  <p style={{ color: "#999", fontSize: 12, margin: "0 0 auto" }}>{sticker.count} items</p>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#8B5E2B" }}>{sticker.price}</span>
                      <span style={{ fontSize: 12, color: "#999", marginLeft: 2 }}> THB</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={() => addToCart(sticker)}
                        style={{
                          background: "#00C300",
                          color: "white",
                          border: "none",
                          borderRadius: 50,
                          padding: "7px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        + รถเขน
                      </button>
                      <Link
                        href={`/${sticker.slug}`}
                        aria-label={`Open ${sticker.name} details`}
                        title={`Open ${sticker.name}`}
                        style={{
                          background: "linear-gradient(90deg, #008C00, #00C300)",
                          color: "white",
                          borderRadius: 50,
                          padding: "7px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        ดูรายละเอียด
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isStatusOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeStatusPopup}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 14, 10, 0.58)",
            zIndex: 2200,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: "linear-gradient(145deg, #ffffff 0%, #f1fbf5 100%)",
              borderRadius: 20,
              border: "1px solid #d7eadf",
              padding: 18,
              boxShadow: "0 28px 70px rgba(0,0,0,0.25)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 style={{ margin: 0, fontWeight: 800, color: "#10482f" }}>เช็คสถานะคำสั่งซื้อ</h3>
              <button type="button" onClick={closeStatusPopup} className="btn-close" aria-label="Close" />
            </div>
            <p style={{ color: "#456153", marginBottom: 12 }}>
              แนะนำให้ลูกค้าเก็บเลขบิลไว้ เพื่อตรวจสอบสถานะคำสั่งซื้อได้ตลอดเวลา
            </p>

            <form onSubmit={handleOrderStatusSubmit}>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="กรอกเลขบิล เช่น aedd2f8bec28bc59"
                  value={statusBillNo}
                  onChange={(event) => setStatusBillNo(event.target.value)}
                />
                <button type="submit" className="btn btn-success" disabled={statusLoading}>
                  {statusLoading ? "กำลังเช็ค..." : "ตรวจสอบ"}
                </button>
              </div>
            </form>

            {statusError ? (
              <p style={{ color: "#b42318", marginTop: 10, marginBottom: 0, fontWeight: 600 }}>{statusError}</p>
            ) : null}

            {statusResult ? (
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 14,
                  border: "1px solid #d9e7df",
                  padding: 12,
                  background: "white",
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <strong style={{ color: "#122f25" }}>เลขบิล: {statusResult.id}</strong>
                  {(() => {
                    const tone = orderStatusBadgeStyle(statusResult.status);
                    return (
                  <span
                    style={{
                      background: tone.background,
                      border: tone.border,
                      color: tone.color,
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {orderStatusLabel(statusResult.status)}
                  </span>
                    );
                  })()}
                </div>
                <div style={{ color: "#4a6256", marginTop: 8, fontSize: 14 }}>
                  ยอดรวม: <strong>{Number(statusResult.total || 0).toLocaleString("th-TH")} THB</strong>
                </div>
                <div style={{ color: "#647d70", marginTop: 4, fontSize: 13 }}>
                  สร้างบิลเมื่อ: {statusResult.createdAt || "-"}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isCartOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(640px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "white",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0, fontWeight: 800 }}>รถเขน</h3>
              <button type="button" onClick={() => setIsCartOpen(false)} className="btn-close" aria-label="Close" />
            </div>

            {Object.keys(cart).length === 0 ? (
              <p style={{ color: "#666", margin: 0 }}>ยังไม่มีสินค้าในรถเขน</p>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {Object.values(cart).map((row) => (
                    <div
                      key={row.item.slug}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid #e7e7e7",
                        borderRadius: 12,
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {row.item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.item.imageUrl}
                            alt={row.item.name}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              objectFit: "cover",
                              border: "1px solid #e7e7e7",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              border: "1px solid #e7e7e7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 22,
                              background: "#fafafa",
                              flexShrink: 0,
                            }}
                          >
                            {row.item.emoji}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700 }}>{row.item.name}</div>
                          <div style={{ color: "#666", fontSize: 13 }}>
                            {row.item.price} THB x {row.qty}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => removeOne(row.item.slug)}>
                          -
                        </button>
                        <span style={{ minWidth: 16, textAlign: "center" }}>{row.qty}</span>
                        <button type="button" className="btn btn-sm btn-success" onClick={() => addToCart(row.item)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <hr />
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Total: {totalPrice} THB</strong>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={clearCart}>
                    Clear
                  </button>
                </div>

                <hr />
                <h5 style={{ marginBottom: 12, fontWeight: 700 }}>Checkout</h5>
                <form onSubmit={handleCheckoutSubmit}>
                  <div className="row g-2">
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ชื่อผู้รับ"
                        value={checkoutForm.fullName}
                        onChange={(event) => setCheckoutForm((prev) => ({ ...prev, fullName: event.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="เบอร์โทร"
                        value={checkoutForm.phone}
                        onChange={(event) => setCheckoutForm((prev) => ({ ...prev, phone: event.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="LINE ID"
                        value={checkoutForm.lineId}
                        onChange={(event) => setCheckoutForm((prev) => ({ ...prev, lineId: event.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="หมายเหตุ (ถ้ามี)"
                        value={checkoutForm.note}
                        onChange={(event) => setCheckoutForm((prev) => ({ ...prev, note: event.target.value }))}
                      />
                    </div>
                  </div>
                  {checkoutMessage ? (
                    <p
                      style={{
                        marginTop: 10,
                        marginBottom: 0,
                        color: checkoutMessage.includes("(#") ? "#007d2f" : "#b03030",
                        fontSize: 14,
                      }}
                    >
                      {checkoutMessage}
                    </p>
                  ) : null}
                  <div className="d-flex justify-content-end mt-3">
                    <button type="submit" className="btn btn-success btn-sm">
                      ยืนยันคำสั่งซื้อ
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
