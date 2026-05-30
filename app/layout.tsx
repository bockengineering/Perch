import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perch | Captive Wi-Fi for Coffee Shops",
  description: "UniFi-only captive portal SaaS for coffee shops with automatic free access and paid extensions.",
  openGraph: {
    title: "Perch",
    description: "Automatic free guest Wi-Fi for coffee shops, with paid extensions after the daily free hour.",
    siteName: "Perch",
    type: "website",
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
