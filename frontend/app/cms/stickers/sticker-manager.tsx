"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CmsSticker, CmsUser } from "../../../lib/cms-api";

type Props = {
  me: CmsUser;
  initialStickers: CmsSticker[];
};

type StickerForm = {
  id: string | null;
  name: string;
  slug: string;
  price: string;
  status: "active" | "draft";
};

const INITIAL_FORM: StickerForm = {
  id: null,
  name: "",
  slug: "",
  price: "69",
  status: "active",
};

export default function CmsStickerManager({ me, initialStickers }: Props) {
  const [stickers, setStickers] = useState<CmsSticker[]>(initialStickers);
  const [form, setForm] = useState<StickerForm>(INITIAL_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [existingCoverImage, setExistingCoverImage] = useState("");
  const [existingPreviewImages, setExistingPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canManage = useMemo(() => ["superadmin", "admin"].includes(me.role), [me.role]);
  const isEditMode = form.id !== null;

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/cms/upload", { method: "POST", body: formData });
    const json = (await res.json()) as { ok?: boolean; error?: string; data?: { url?: string } };
    if (!res.ok || !json.ok || !json.data?.url) {
      throw new Error(json.error || `Upload failed: ${file.name}`);
    }
    return json.data.url;
  }

  async function refreshList() {
    const res = await fetch("/api/cms/stickers", { method: "GET", cache: "no-store" });
    const json = (await res.json()) as { ok?: boolean; data?: CmsSticker[] };
    if (res.ok && json.ok && Array.isArray(json.data)) {
      setStickers(json.data);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setCoverFile(null);
    setPreviewFiles([]);
    setExistingCoverImage("");
    setExistingPreviewImages([]);
  }

  function beginEdit(sticker: CmsSticker) {
    setForm({
      id: sticker.id,
      name: sticker.name,
      slug: sticker.slug,
      price: String(sticker.price ?? 69),
      status: (sticker.status as "active" | "draft") || "active",
    });
    setExistingCoverImage(sticker.coverImage || "");
    setExistingPreviewImages(Array.isArray(sticker.previewImages) ? [...sticker.previewImages] : []);
    setCoverFile(null);
    setPreviewFiles([]);
    setMessage("เข้าสู่โหมดแก้ไขแล้ว");
  }

  async function removeSticker(id: string) {
    if (!canManage) {
      setMessage("สิทธิ์ไม่พอสำหรับลบสติกเกอร์");
      return;
    }

    const ok = window.confirm("ยืนยันการลบสติกเกอร์นี้?");
    if (!ok) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cms/stickers/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.error || "ลบสติกเกอร์ไม่สำเร็จ");
        return;
      }

      setMessage("ลบสติกเกอร์เรียบร้อยแล้ว");
      if (form.id === id) {
        resetForm();
      }
      await refreshList();
    } catch {
      setMessage("เกิดข้อผิดพลาดระหว่างลบข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!canManage) {
      setMessage("สิทธิ์ไม่พอสำหรับจัดการสติกเกอร์ (ต้องเป็น superadmin/admin)");
      return;
    }
    if (!form.name.trim()) {
      setMessage("กรุณากรอกชื่อสติกเกอร์");
      return;
    }

    setLoading(true);
    try {
      const uploadedCover = coverFile ? await uploadFile(coverFile) : "";
      const uploadedPreviewUrls: string[] = [];
      for (const file of previewFiles) {
        uploadedPreviewUrls.push(await uploadFile(file));
      }

      const finalCoverImage = uploadedCover || existingCoverImage;
      const finalPreviewImages = [...existingPreviewImages, ...uploadedPreviewUrls];

      if (finalPreviewImages.length === 0) {
        setMessage("กรุณาอัปโหลดภาพตัวอย่างอย่างน้อย 1 รูป");
        setLoading(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        price: Number(form.price || "0"),
        status: form.status,
        coverImage: finalCoverImage,
        previewImages: finalPreviewImages,
      };

      const url = isEditMode ? `/api/cms/stickers/${form.id}` : "/api/cms/stickers";
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.error || (isEditMode ? "แก้ไขสติกเกอร์ไม่สำเร็จ" : "เพิ่มสติกเกอร์ไม่สำเร็จ"));
        return;
      }

      setMessage(isEditMode ? "แก้ไขสติกเกอร์เรียบร้อยแล้ว" : "เพิ่มสติกเกอร์เรียบร้อยแล้ว");
      resetForm();
      await refreshList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาดระหว่างบันทึก");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>จัดการสติกเกอร์</h1>
            <p style={{ margin: "6px 0 0", color: "#4d5b52" }}>
              ผู้ใช้: {me.username} ({me.role})
            </p>
          </div>
          <Link href="/cms" style={{ textDecoration: "none" }}>
            <button type="button" className="btn btn-outline-success">
              กลับ Dashboard
            </button>
          </Link>
        </div>

        <section
          style={{
            background: "white",
            border: "1px solid #dfe6dc",
            borderRadius: 16,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 20 }}>{isEditMode ? "แก้ไขสติกเกอร์" : "เพิ่มสติกเกอร์ใหม่"}</h2>
          <form onSubmit={onSubmit}>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  ชื่อสติกเกอร์
                </label>
                <input
                  className="form-control"
                  placeholder="เช่น น้องเนยชุดทำงาน"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Slug
                </label>
                <input
                  className="form-control"
                  placeholder="เช่น nong-noey-work"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  ราคา (THB)
                </label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  placeholder="69"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  สถานะ
                </label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as "active" | "draft" }))}
                >
                  <option value="active">เผยแพร่</option>
                  <option value="draft">ฉบับร่าง</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" style={{ fontWeight: 700, visibility: "hidden", display: "block" }}>
                  บันทึก
                </label>
                <button className="btn btn-success w-100" disabled={loading || !canManage} type="submit">
                  {loading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "บันทึกสติกเกอร์"}
                </button>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" style={{ fontWeight: 700, visibility: "hidden", display: "block" }}>
                  ยกเลิก
                </label>
                <button type="button" className="btn btn-outline-secondary w-100" onClick={resetForm} disabled={loading}>
                  ล้างฟอร์ม
                </button>
              </div>
            </div>

            <div className="row g-2 mt-2">
              <div className="col-12 col-md-6">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  ภาพปก (1 รูป)
                </label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
                {coverFile ? <small style={{ color: "#4f5d53" }}>ไฟล์ใหม่: {coverFile.name}</small> : null}
                {!coverFile && existingCoverImage ? (
                  <small style={{ color: "#4f5d53" }}>ใช้ภาพเดิมอยู่</small>
                ) : (
                  <small style={{ color: "#5a675f" }}>ถ้าไม่เลือกใหม่ จะใช้ภาพเดิม (ตอนแก้ไข)</small>
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  ภาพตัวอย่าง (หลายรูป)
                </label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPreviewFiles(Array.from(e.target.files || []))}
                />
                {previewFiles.length > 0 ? (
                  <small style={{ color: "#4f5d53" }}>เพิ่มใหม่ {previewFiles.length} รูป</small>
                ) : (
                  <small style={{ color: "#5a675f" }}>จำนวนสติกเกอร์จะนับจากรูปตัวอย่างทั้งหมด</small>
                )}
              </div>
            </div>

            {existingPreviewImages.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <p style={{ marginBottom: 8, color: "#4f5d53", fontWeight: 700 }}>รูปตัวอย่างเดิม</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {existingPreviewImages.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setExistingPreviewImages((prev) => prev.filter((item) => item !== url))}
                    >
                      ลบรูปเดิม 1 รูป
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </form>

          {message ? (
            <p style={{ marginTop: 10, marginBottom: 0, color: message.includes("เรียบร้อย") ? "#0d8b39" : "#b63939" }}>
              {message}
            </p>
          ) : null}
        </section>

        <section
          style={{
            background: "white",
            border: "1px solid #dfe6dc",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 20 }}>รายการสติกเกอร์ทั้งหมด ({stickers.length})</h2>
          <div className="row g-3">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="col-12 col-md-6 col-xl-4">
                <article
                  style={{
                    border: "1px solid #e0e8df",
                    borderRadius: 14,
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ background: "#f2f7f1", padding: 12, textAlign: "center" }}>
                    {sticker.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sticker.coverImage}
                        alt={sticker.name}
                        style={{ width: 110, height: 110, borderRadius: 12, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ color: "#77847d" }}>ไม่มีภาพปก</div>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    <h3 style={{ marginTop: 0, fontSize: 18 }}>{sticker.name}</h3>
                    <p style={{ margin: 0, color: "#4f5d53" }}>slug: {sticker.slug}</p>
                    <p style={{ margin: "4px 0 0", color: "#4f5d53" }}>
                      ราคา {sticker.price} THB • {sticker.count} items
                    </p>
                    <p style={{ margin: "4px 0 0", color: "#4f5d53" }}>
                      สถานะ: {sticker.status} • ตัวอย่าง {sticker.previewImages.length} รูป
                    </p>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <Link href={`/${sticker.slug}`} target="_blank" className="btn btn-sm btn-outline-success">
                        Open
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => beginEdit(sticker)}
                        disabled={!canManage || loading}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeSticker(sticker.id)}
                        disabled={!canManage || loading}
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

