import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

const baseMetadata: Metadata = {
  applicationName: "Veil",
  title: {
    default: "Veil — Your skincare, organized",
    template: "%s · Veil",
  },
  description:
    "A private, local-first skincare routine tracker designed for iPhone.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Veil",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: "/icons/icon-32.png",
    shortcut: "/icons/icon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    ...baseMetadata,
    metadataBase,
    openGraph: {
      type: "website",
      title: "Veil — Your skincare, organized",
      description: "A private, local-first skincare routine tracker designed for iPhone.",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Veil skincare routine tracker" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Veil — Your skincare, organized",
      description: "A private, local-first skincare routine tracker designed for iPhone.",
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1eb" },
    { media: "(prefers-color-scheme: dark)", color: "#151814" },
  ],
};

const themeScript = `
  try {
    const theme = localStorage.getItem('veil.theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme;
    }
  } catch (_) {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
