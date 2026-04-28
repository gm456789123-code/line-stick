import { getWordPressBaseUrl } from "./wordpress";

function envEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getLineOaClientConfig() {
  return {
    enabled: envEnabled(process.env.NEXT_PUBLIC_LINE_OA_ENABLED),
    liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? "",
    webhookStatusUrl: `${getWordPressBaseUrl()}/wp-json/linestick/v1/line/status`,
  };
}

type LineOaStatus = {
  line_oa_enabled: boolean;
  channel_secret_configured: boolean;
  channel_access_token_configured: boolean;
  liff_id_configured: boolean;
  webhook_path: string;
  mode: string;
};

export async function fetchLineOaStatus(): Promise<LineOaStatus> {
  const { webhookStatusUrl } = getLineOaClientConfig();
  const response = await fetch(webhookStatusUrl, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`LINE OA status failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as LineOaStatus;
}
