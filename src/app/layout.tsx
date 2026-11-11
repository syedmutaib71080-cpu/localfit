import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LocalFit — AI-Powered Nutrition & Fitness",
    template: "%s • LocalFit",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: "LocalFit Team" }],
  keywords: [
    "nutrition",
    "fitness",
    "wellness",
    "healthy habits",
    "whole foods",
    "movement tracking",
    "vitality",
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#1C1F1D] selection:bg-[#C7DBD0] selection:text-[#1C1F1D]">
        {children}
      </body>
    </html>
  );
}
