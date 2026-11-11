import * as React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5] text-[#1C1F1D]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
