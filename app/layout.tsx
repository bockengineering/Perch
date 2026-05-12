import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perch",
  description: "UniFi-only captive portal SaaS for coffee shops.",
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
