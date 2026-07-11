import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vision Len",
  description:
    "Vision Len — a hands-free AI visual assistant for visually impaired users.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
