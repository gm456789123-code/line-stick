import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DetailActionButtons from "../../components/DetailActionButtons";
import { getPublicSiteSettings, getPublicStickerBySlug } from "../../lib/cms-public";

type Props = {
  params: Promise<{ slug: string[] }>;
};

const FALLBACK_EMOJIS = ["🐻", "🐥", "🌙", "❤️", "🐰", "😸", "🦁", "✨"];

function fallbackStickerBySlug(slug: string) {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;
  const match = /^sample-(\d+)$/i.exec(cleanSlug);
  const idx = match ? Math.max(1, Number(match[1])) - 1 : 0;
  const displayName = match
    ? `Sticker Sample ${idx + 1}`
    : cleanSlug
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

  return {
    id: match ? `sample-${idx + 1}` : cleanSlug,
    slug: cleanSlug,
    name: displayName || cleanSlug,
    price: 69 + (idx % 4) * 10,
    count: 20 + idx * 2,
    status: "active",
    coverImage: "",
    previewImages: [] as string[],
    createdAt: "",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const target = slug[slug.length - 1];
  const sticker = (await getPublicStickerBySlug(target)) ?? fallbackStickerBySlug(target);

  if (!sticker) {
    return { title: "Not found" };
  }

  return {
    title: sticker.name,
    description: `รายละเอียดสติกเกอร์ ${sticker.name}`,
  };
}

export default async function StickerDetailPage({ params }: Props) {
  const settings = await getPublicSiteSettings();
  if (!settings.siteEnabled) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f5f7f3" }}>
        <div style={{ maxWidth: 680, textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>ปิดปรับปรุงชั่วคราว</h1>
          <p style={{ color: "#4e5b51" }}>{settings.maintenanceMessage}</p>
        </div>
      </main>
    );
  }

  const { slug } = await params;
  const target = slug[slug.length - 1];
  const sticker = (await getPublicStickerBySlug(target)) ?? fallbackStickerBySlug(target);

  if (!sticker) notFound();

  const emoji = FALLBACK_EMOJIS[sticker.name.length % FALLBACK_EMOJIS.length];
  const packSize = sticker.previewImages.length > 0 ? sticker.previewImages.length : sticker.count || 0;
  const heroImage = sticker.coverImage || sticker.previewImages[0] || "";

  return (
    <main className="detail-shell">
      <div className="detail-backdrop" />

      <header className="detail-top">
        <Link href="/" className="detail-back">
          ← กลับไปหน้าหลัก
        </Link>
        <Link href="/cms/login" className="detail-origin">
          สินค้า
        </Link>
      </header>

      <section className="detail-stage">
        <div className="detail-art">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={sticker.name} className="detail-image" />
          ) : (
            <div className="detail-emoji">{emoji}</div>
          )}
        </div>

        <div className="detail-info">
          <p className="detail-kicker">Sticker</p>
          <h1>{sticker.name}</h1>

          <div className="detail-metrics">
            <div className="detail-metric">
              <span className="detail-metric-label">Price</span>
              <strong>{sticker.price || 69} THB</strong>
            </div>
            <div className="detail-metric">
              <span className="detail-metric-label">Pack Size</span>
              <strong>{packSize} items</strong>
            </div>
          </div>

          <DetailActionButtons
            item={{
              slug: sticker.slug,
              name: sticker.name,
              count: packSize,
              price: sticker.price || 69,
              imageUrl: heroImage,
              emoji,
            }}
          />
        </div>
      </section>

      <section className="detail-content">
        <article className="wp-rich">
          <p>รวมภาพตัวอย่างและรายละเอียดแพ็กสติกเกอร์สำหรับลูกค้า</p>
        </article>
      </section>

      {sticker.previewImages.length > 0 ? (
        <section className="detail-preview">
          <div className="detail-preview-head">
            <h2>ตัวอย่างสติกเกอร์</h2>
          </div>

          <div className="detail-preview-grid">
            {sticker.previewImages.map((imageUrl, index) => (
              <figure key={`${imageUrl}-${index}`} className="detail-preview-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={`${sticker.name} preview ${index + 1}`} />
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
