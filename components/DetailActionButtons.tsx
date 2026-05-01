"use client";

import { useRouter } from "next/navigation";

type Props = {
  item: {
    slug: string;
    name: string;
    count: number;
    price: number;
    imageUrl: string;
    emoji: string;
  };
};

type CartRow = {
  item: {
    slug: string;
    name: string;
    count: number;
    price: number;
    tag: string;
    emoji: string;
    imageUrl: string;
  };
  qty: number;
};

const CART_STORAGE_KEY = "line_stick_cart_v1";

function addItemToCartStorage(input: Props["item"]) {
  if (typeof window === "undefined") return;

  const normalizedItem: CartRow["item"] = {
    slug: input.slug,
    name: input.name,
    count: input.count,
    price: input.price,
    tag: "",
    emoji: input.emoji,
    imageUrl: input.imageUrl,
  };

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CartRow>) : {};
    const existing = parsed[normalizedItem.slug];

    const next: Record<string, CartRow> = {
      ...parsed,
      [normalizedItem.slug]: {
        item: normalizedItem,
        qty: existing ? existing.qty + 1 : 1,
      },
    };

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    const fallback: Record<string, CartRow> = {
      [normalizedItem.slug]: {
        item: normalizedItem,
        qty: 1,
      },
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(fallback));
  }
}

export default function DetailActionButtons({ item }: Props) {
  const router = useRouter();

  function onBuyNow() {
    addItemToCartStorage(item);
    router.push("/?openCart=1");
  }

  function onAddAndBack() {
    addItemToCartStorage(item);
    router.push("/");
  }

  return (
    <div className="detail-actions">
      <button type="button" className="detail-buy" onClick={onBuyNow}>
        ซื้อเลย
      </button>
      <button type="button" className="detail-ghost" onClick={onAddAndBack}>
        + รถเข็น
      </button>
    </div>
  );
}

