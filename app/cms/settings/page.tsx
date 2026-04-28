import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CmsShell from "../../../components/CmsShell";
import { getCmsMe, getCmsSiteSettings } from "../../../lib/cms-api";
import CmsSettingsManager from "./settings-manager";

export default async function CmsSettingsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const me = await getCmsMe({ cookieHeader });
  if (!me) {
    redirect("/cms/login");
  }

  const settings = await getCmsSiteSettings({ cookieHeader });

  return (
    <CmsShell activeMenu="settings">
      <CmsSettingsManager me={me} initialSettings={settings} />
    </CmsShell>
  );
}

