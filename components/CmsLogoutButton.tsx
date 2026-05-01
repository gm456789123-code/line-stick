"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  className?: string;
};

export default function CmsLogoutButton({ className = "" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/cms/logout", { method: "POST" });
    } finally {
      router.replace("/cms/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={onLogout} disabled={loading} className={className}>
      {loading ? "กำลังออก..." : "ออกจากระบบ"}
    </button>
  );
}
