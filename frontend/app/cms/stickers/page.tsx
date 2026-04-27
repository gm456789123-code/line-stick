import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CmsShell from "../../../components/CmsShell";
import CmsStickerManager from "./sticker-manager";
import { getCmsMe, getCmsStickers } from "../../../lib/cms-api";

export default async function CmsStickersPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const me = await getCmsMe({ cookieHeader });
  if (!me) {
    redirect("/cms/login");
  }

  const stickers = await getCmsStickers({ cookieHeader });

  return (
    <CmsShell activeMenu="stickers">
      <CmsStickerManager me={me} initialStickers={stickers} />
    </CmsShell>
  );
}
