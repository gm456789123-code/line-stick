import Link from "next/link";
import PaymentStatusButton from "../../components/PaymentStatusButton";
import PaymentEntryPopup from "../../components/PaymentEntryPopup";
import styles from "./payment.module.css";

type SearchParams = {
  orderId?: string;
  token?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

type PublicOrder = {
  id: string;
  customer?: {
    fullName?: string;
    phone?: string;
    lineId?: string;
    note?: string;
  };
  items?: Array<{
    name?: string;
    qty?: number;
    price?: number;
    lineTotal?: number;
    imageUrl?: string;
    emoji?: string;
  }>;
  total?: number;
  status?: string;
  paymentSlipImage?: string;
};

async function getOrder(orderId: string, token: string): Promise<PublicOrder | null> {
  const appBase = process.env.FRONTEND_URL || "http://localhost:3000";
  const res = await fetch(
    `${appBase}/api/public/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { ok?: boolean; data?: PublicOrder };
  if (!json.ok || !json.data) return null;
  return json.data;
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending_payment":
      return "รอชำระเงิน";
    case "under_review":
      return "กำลังตรวจสอบ";
    case "completed":
      return "สำเร็จแล้ว";
    case "cancelled":
      return "ยกเลิก";
    default:
      return status;
  }
}

function statusTone(status: string): "warn" | "info" | "success" | "danger" {
  if (status === "pending_payment") return "warn";
  if (status === "under_review") return "info";
  if (status === "completed") return "success";
  return "danger";
}

function money(value: number): string {
  return `${value.toLocaleString("th-TH")} THB`;
}

function toAbsoluteAssetUrl(rawUrl: string, backendOrigin: string): string {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${backendOrigin}${value}`;
  return `${backendOrigin}/${value}`;
}

function EmptyState() {
  return (
    <main className={styles.fallbackPage}>
      <div className={styles.fallbackCard}>
        <h1>ไม่พบข้อมูลคำสั่งซื้อ</h1>
        <p>กรุณากลับไปทำรายการใหม่อีกครั้ง</p>
        <Link href="/" className="btn btn-success">
          กลับหน้าร้าน
        </Link>
      </div>
    </main>
  );
}

export default async function PaymentPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = String(sp.orderId || "").trim();
  const token = String(sp.token || "").trim();

  if (!orderId || !token) {
    return <EmptyState />;
  }

  const order = await getOrder(orderId, token);
  if (!order) {
    return (
      <main className={styles.fallbackPage}>
        <div className={styles.fallbackCard}>
          <h1>ไม่สามารถโหลดข้อมูลชำระเงินได้</h1>
          <p>ลิงก์อาจหมดอายุหรือข้อมูลไม่ถูกต้อง</p>
          <Link href="/" className="btn btn-success">
            กลับหน้าร้าน
          </Link>
        </div>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total ?? 0);
  const status = String(order.status ?? "pending_payment");
  const tone = statusTone(status);
  const backendOrigin = (() => {
    try {
      return new URL(process.env.CMS_BACKEND_API_BASE || "http://localhost/line-stick/backend/api").origin;
    } catch {
      return "http://localhost";
    }
  })();
  const slipUrl = order.paymentSlipImage
    ? String(order.paymentSlipImage).startsWith("http")
      ? String(order.paymentSlipImage)
      : `${backendOrigin}${order.paymentSlipImage}`
    : "";

  return (
    <main className={styles.page}>
      <PaymentEntryPopup orderId={order.id} />
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>Payment Center</p>
            <h1 className={styles.title}>ยืนยันการชำระเงิน</h1>
            <p className={styles.sub}>
              คำสั่งซื้อ <strong>#{order.id}</strong>
            </p>
          </div>
          <span className={`${styles.status} ${styles[tone]}`}>{statusLabel(status)}</span>
        </header>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>ข้อมูลผู้สั่งซื้อ</h2>
            <div className={styles.customerRows}>
              <div>
                <span>ชื่อ</span>
                <strong>{order.customer?.fullName || "-"}</strong>
              </div>
              <div>
                <span>เบอร์โทร</span>
                <strong>{order.customer?.phone || "-"}</strong>
              </div>
              <div>
                <span>LINE ID</span>
                <strong>{order.customer?.lineId || "-"}</strong>
              </div>
            </div>
            <div className={styles.noteBox}>
              <span>หมายเหตุ</span>
              <p>{order.customer?.note || "ไม่มี"}</p>
            </div>

            <PaymentStatusButton orderId={order.id} token={token} currentStatus={status} />

            {slipUrl ? (
              <div className={styles.uploadedCard}>
                <p>สลิปที่อัปโหลดล่าสุด</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipUrl} alt="payment slip" className={styles.uploadedImage} />
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>สรุปรายการสินค้า</h2>
            <div className={styles.items}>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const price = Number(item.price ?? 0);
                  const qty = Number(item.qty ?? 1);
                  const lineTotal = Number(item.lineTotal ?? price * qty);
                  const imageUrl = toAbsoluteAssetUrl(String(item.imageUrl ?? ""), backendOrigin);
                  const emoji = String(item.emoji ?? "").trim();
                  return (
                    <div key={`${item.name || "item"}-${index}`} className={styles.itemRow}>
                      <div className={styles.itemMeta}>
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={item.name || "Sticker"} className={styles.itemThumb} />
                        ) : (
                          <div className={styles.itemThumbFallback}>{emoji || "🏷"}</div>
                        )}
                        <div>
                          <strong>{item.name || "Sticker"}</strong>
                          <span>
                            {money(price)} x {qty}
                          </span>
                        </div>
                      </div>
                      <strong>{money(lineTotal)}</strong>
                    </div>
                  );
                })
              ) : (
                <p className={styles.emptyItems}>ยังไม่มีรายการสินค้า</p>
              )}
            </div>

            <div className={styles.totalBox}>
              <span>ยอดรวมทั้งหมด</span>
              <strong>{money(total)}</strong>
            </div>

            <div className={styles.tipBox}>
              <h3>วิธีชำระเงิน</h3>
              <p>โอนตามยอดให้ครบ จากนั้นอัปโหลดสลิปและกดปุ่มแจ้งชำระเงิน ระบบจะส่งคำสั่งซื้อไปให้แอดมินตรวจสอบทันที</p>
            </div>

            <Link href="/" className="btn btn-outline-success" style={{ width: "fit-content" }}>
              กลับไปเลือกซื้อเพิ่ม
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}



