import type { Metadata } from "next";
import { getPublicSiteSettings } from "../lib/cms-public";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const title = settings.siteTitle || "LINE Stick Store";
  const description = settings.siteDescription || "Modern LINE sticker storefront powered by Next.js.";
  const icon = settings.tabIconUrl || "/favicon.ico";
  const previewImage = settings.tabPreviewImageUrl || undefined;

  return {
    title,
    description,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    openGraph: previewImage
      ? {
          title,
          description,
          images: [previewImage],
        }
      : undefined,
    twitter: previewImage
      ? {
          card: "summary_large_image",
          title,
          description,
          images: [previewImage],
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
