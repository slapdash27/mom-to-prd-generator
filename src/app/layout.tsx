import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoM → PRD Generator",
  description:
    "Ubah catatan Minutes of Meeting menjadi Product Requirements Document berbahasa Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      className={`app-root ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="app-body min-h-dvh">{children}</body>
    </html>
  );
}
