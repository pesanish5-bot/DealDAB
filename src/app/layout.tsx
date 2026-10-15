import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealDAB — Operator board",
  description: "DealDAB is a voice AI negotiation platform that compares offers and returns an evidence-backed recommendation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
