import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://perch-blue.vercel.app"),
  title: "Perch | Captive Wi-Fi for Coffee Shops",
  applicationName: "Perch",
  description: "UniFi-only captive portal SaaS for coffee shops with automatic free access and paid extensions.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Perch",
    description: "Automatic free guest Wi-Fi for coffee shops, with paid extensions after the daily free hour.",
    siteName: "Perch",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Perch",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Perch",
    description: "Automatic free guest Wi-Fi for coffee shops, with paid extensions after the daily free hour.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
