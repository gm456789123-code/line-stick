import Link from "next/link";
import styles from "./cms-shell.module.css";

type MenuKey = "dashboard" | "stickers" | "orders" | "paymentSettings" | "settings";

type Props = {
  activeMenu: MenuKey;
  children: React.ReactNode;
};

const menuItems: Array<{ key: MenuKey; label: string; href: string }> = [
  { key: "dashboard", label: "ภาพรวมระบบ", href: "/cms" },
  { key: "stickers", label: "จัดการสติกเกอร์", href: "/cms/stickers" },
  { key: "orders", label: "คำสั่งซื้อ", href: "/cms/orders" },
  { key: "paymentSettings", label: "ตั้งค่าบัญชี", href: "/cms/payment-settings" },
  { key: "settings", label: "ตั้งค่าเว็บไซต์", href: "/cms/settings" },
];

export default function CmsShell({ activeMenu, children }: Props) {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBox}>
          <div className={styles.avatar}>LS</div>
          <div>
            <p className={styles.brandTitle}>Line Stick CMS</p>
            <p className={styles.brandSub}>CONTROL PANEL</p>
          </div>
        </div>

        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`${styles.menuItem} ${activeMenu === item.key ? styles.menuItemActive : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className={styles.content}>{children}</section>
    </main>
  );
}
