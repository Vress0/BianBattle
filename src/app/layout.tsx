import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatusHeartbeat from "@/components/status/StatusHeartbeat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BianBattle｜線上辯論配對平台",
  description:
    "BianBattle 是一個真人線上辯論配對平台，支援辯論房、嘴砲房、排位賽、1v1、3v3、5v5 對戰，並使用 AI 擔任主持人、裁判與賽後分析教練。",
  keywords: [
    "BianBattle",
    "線上辯論",
    "辯論平台",
    "嘴砲房",
    "排位賽",
    "AI 裁判",
    "debate platform",
  ],
  openGraph: {
    title: "BianBattle｜線上辯論配對平台",
    description:
      "真人線上辯論配對平台，支援辯論房、嘴砲房、排位賽、1v1、3v3、5v5 對戰。AI 擔任主持人、裁判與賽後分析教練。",
    url: "https://bianbattle.com",
    siteName: "BianBattle",
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BianBattle｜線上辯論配對平台",
    description:
      "真人線上辯論配對平台，支援辯論房、嘴砲房、排位賽、1v1、3v3、5v5 對戰。AI 擔任主持人、裁判與賽後分析教練。",
  },
  metadataBase: new URL("https://bianbattle.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/bianbattle-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-white">
        <Navbar />
        <StatusHeartbeat />
        {children}
        <Footer />
      </body>
    </html>
  );
}
