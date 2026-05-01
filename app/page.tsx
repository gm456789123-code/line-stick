import StickerShopClient, { type StickerItem } from "../components/StickerShopClient";
import { getPublicSiteSettings, getPublicStickers } from "../lib/cms-public";

const EMOJI_POOL = ["🐻", "🐥", "🌙", "❤️", "🐰", "😸", "🦁", "✨"];
const TAG_POOL = ["Popular", "New", "Recommended", ""];

type SearchParams = {
  openCart?: string;
};

type HomeProps = {
  searchParams: Promise<SearchParams>;
};

function fallbackStickers(): StickerItem[] {
  return EMOJI_POOL.map((emoji, i) => ({
    slug: `sample-${i + 1}`,
    name: `Sticker Sample ${i + 1}`,
    count: 20 + i * 2,
    price: 69 + (i % 4) * 10,
    tag: TAG_POOL[i % TAG_POOL.length],
    emoji,
    imageUrl: "",
  }));
}

async function loadStickers(): Promise<StickerItem[]> {
  const stickers = await getPublicStickers();
  if (stickers.length === 0) {
    return fallbackStickers();
  }

  return stickers.map((sticker, index) => ({
    slug: sticker.slug,
    name: sticker.name || `Sticker ${index + 1}`,
    count: sticker.previewImages.length > 0 ? sticker.previewImages.length : sticker.count || 0,
    price: Number.isFinite(sticker.price) ? sticker.price : 69,
    tag: TAG_POOL[index % TAG_POOL.length],
    emoji: EMOJI_POOL[index % EMOJI_POOL.length],
    imageUrl: sticker.coverImage || sticker.previewImages[0] || "",
  }));
}

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const initialCartOpen = String(sp.openCart || "") === "1";

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

  const stickers = await loadStickers();
  return <StickerShopClient stickers={stickers} initialCartOpen={initialCartOpen} />;
}
