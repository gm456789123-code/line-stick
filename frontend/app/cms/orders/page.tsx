import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CmsShell from "../../../components/CmsShell";
import { getCmsMe, getCmsOrders } from "../../../lib/cms-api";
import CmsOrdersManager from "./orders-manager";

export default async function CmsOrdersPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const me = await getCmsMe({ cookieHeader });
  if (!me) {
    redirect("/cms/login");
  }

  const orders = await getCmsOrders({ cookieHeader });

  return (
    <CmsShell activeMenu="orders">
      <CmsOrdersManager me={me} initialOrders={orders} />
    </CmsShell>
  );
}

