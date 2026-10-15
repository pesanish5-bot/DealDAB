import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidWise AI — Negotiation Command Center",
  description: "Evidence-backed voice negotiation for local procurement.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
