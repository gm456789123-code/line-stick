import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CmsShell from "../../../components/CmsShell";
import { getCmsMe } from "../../../lib/cms-api";
import { getPaymentSettings } from "../../../lib/server/payment-settings";
import PaymentSettingsManager from "./payment-settings-manager";

export default async function CmsPaymentSettingsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const me = await getCmsMe({ cookieHeader });
  if (!me) {
    redirect("/cms/login");
  }

  const settings = await getPaymentSettings();

  return (
    <CmsShell activeMenu="paymentSettings">
      <PaymentSettingsManager me={me} initialSettings={settings} />
    </CmsShell>
  );
}
