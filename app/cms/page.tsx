import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CmsShell from "../../components/CmsShell";
import CmsLogoutButton from "../../components/CmsLogoutButton";
import { getCmsMe, getCmsSummary } from "../../lib/cms-api";
import styles from "./styles.module.css";

export const metadata: Metadata = {
  title: "CMS Dashboard",
  description: "Custom CMS dashboard for LINE Stick project.",
};

function toPercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  const p = Math.round((value / total) * 100);
  return Math.max(0, Math.min(100, p));
}

export default async function CmsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const me = await getCmsMe({ cookieHeader });
  if (!me) {
    redirect("/cms/login");
  }

  const summary = await getCmsSummary({ cookieHeader });

  const topStats = [
    { label: "สติกเกอร์ทั้งหมด", value: `${summary.totalStickers}`, hint: "แพ็กที่มีในระบบ" },
    { label: "ออเดอร์ขายทั้งหมด", value: `${summary.totalOrders}`, hint: "รายการสั่งซื้อทั้งหมด" },
    { label: "ออเดอร์สำเร็จ", value: `${summary.completedOrders}`, hint: "แอดมินปิดงานแล้ว" },
    { label: "รอตรวจสอบ", value: `${summary.underReviewOrders}`, hint: "รอตรวจสอบการชำระเงิน" },
    { label: "รายได้วันนี้", value: `${summary.todayRevenue.toLocaleString("th-TH")}`, hint: "บาท (THB)" },
    { label: "ออเดอร์วันนี้", value: `${summary.todayOrders}`, hint: "สั่งซื้อในวันนี้" },
  ];

  const chartData = [
    {
      key: "pending_payment",
      label: "รอชำระเงิน",
      value: Math.max(summary.totalOrders - summary.completedOrders - summary.underReviewOrders, 0),
      color: "#f59e0b",
    },
    {
      key: "under_review",
      label: "กำลังตรวจสอบ",
      value: summary.underReviewOrders,
      color: "#38bdf8",
    },
    {
      key: "completed",
      label: "สำเร็จแล้ว",
      value: summary.completedOrders,
      color: "#22c55e",
    },
  ];

  return (
    <CmsShell activeMenu="dashboard">
      <section>
        <header className={styles.header}>
          <div>
            <h1>Dashboard</h1>
            <p>ภาพรวมการทำงานของระบบหลังบ้านสติกเกอร์</p>
            <p>
              ผู้ใช้: {me.username} ({me.role})
            </p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.primaryButton}>
              อัปเดตข้อมูลล่าสุด
            </button>
            <CmsLogoutButton className={styles.ghostButton} />
          </div>
        </header>

        <div className={styles.gridFour}>
          {topStats.map((card) => (
            <article key={card.label} className={styles.statCard}>
              <p className={styles.cardLabel}>{card.label}</p>
              <p className={styles.cardValue}>{card.value}</p>
              <p className={styles.cardHint}>{card.hint}</p>
            </article>
          ))}
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>กราฟสถานะคำสั่งซื้อ</h2>
            <span>ออเดอร์ทั้งหมด {summary.totalOrders}</span>
          </div>

          <div className={styles.chartWrap}>
            {chartData.map((item) => {
              const width = toPercent(item.value, summary.totalOrders || 1);
              return (
                <div key={item.key} className={styles.chartRow}>
                  <div className={styles.chartMeta}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className={styles.chartBarBg}>
                    <div className={styles.chartBarFill} style={{ width: `${width}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </CmsShell>
  );
}

