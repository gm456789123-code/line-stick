"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CmsLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootMessage, setBootMessage] = useState("กำลังเตรียมระบบ...");

  useEffect(() => {
    fetch("/api/cms/health", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { ok?: boolean; db?: string };
        if (res.ok && json?.ok) {
          setBootMessage("ระบบพร้อมใช้งาน");
          return;
        }
        setBootMessage("เชื่อมต่อฐานข้อมูลไม่สำเร็จ");
      })
      .catch(() => {
        setBootMessage("ไม่สามารถเชื่อมต่อ backend ได้");
      });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.replace("/cms");
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="cms-login-page"
    >
      <div className="blob blobA" />
      <div className="blob blobB" />
      <form
        onSubmit={onSubmit}
        className="login-card"
      >
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>CMS Login</h1>
        <p style={{ marginTop: 0, color: "#aac6e6" }}>แอดมิน 4 ระดับ: superadmin / dev / admin / editor</p>
        <p style={{ marginTop: 0, color: "#89d6b1", fontSize: 13 }}>{bootMessage}</p>

        <label style={{ display: "block", marginBottom: 8 }}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(145, 191, 251, 0.4)",
            background: "rgba(9, 21, 35, 0.9)",
            color: "#eef6ff",
            marginBottom: 12,
          }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(145, 191, 251, 0.4)",
            background: "rgba(9, 21, 35, 0.9)",
            color: "#eef6ff",
            marginBottom: 14,
          }}
        />

        {error ? <p style={{ color: "#ff8d8d", marginTop: 0 }}>{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            border: 0,
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #17b86a 0%, #00b7de 100%)",
            color: "#042011",
            cursor: "pointer",
          }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ CMS"}
        </button>
      </form>

      <style jsx>{`
        .cms-login-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 10% 10%, #1f4f89 0%, rgba(31, 79, 137, 0) 28%),
            linear-gradient(145deg, #081223 0%, #10233d 55%, #102836 100%);
        }

        .login-card {
          width: min(460px, 100%);
          background: rgba(15, 29, 49, 0.85);
          border: 1px solid rgba(152, 199, 255, 0.3);
          border-radius: 18px;
          padding: 22px;
          color: #eef6ff;
          z-index: 2;
          animation: cardFadeIn 520ms ease-out;
          backdrop-filter: blur(6px);
        }

        .blob {
          position: absolute;
          border-radius: 999px;
          filter: blur(2px);
          opacity: 0.38;
          z-index: 1;
          pointer-events: none;
        }

        .blobA {
          width: 320px;
          height: 320px;
          left: -70px;
          top: 8%;
          background: radial-gradient(circle, #26c3ff 0%, rgba(38, 195, 255, 0) 70%);
          animation: floatA 7s ease-in-out infinite;
        }

        .blobB {
          width: 380px;
          height: 380px;
          right: -120px;
          bottom: -40px;
          background: radial-gradient(circle, #17b86a 0%, rgba(23, 184, 106, 0) 72%);
          animation: floatB 8.5s ease-in-out infinite;
        }

        @keyframes cardFadeIn {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes floatA {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(26px, -18px, 0);
          }
        }

        @keyframes floatB {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-30px, 20px, 0);
          }
        }
      `}</style>
    </main>
  );
}
