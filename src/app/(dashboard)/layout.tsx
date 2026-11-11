import * as React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Logo } from "@/components/ui/logo";
import { PageContainer } from "@/components/ui/page-container";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FAF8F5] text-[#1C1F1D]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex h-16 items-center justify-between border-b border-[#E8E5DD] bg-white/80 px-4 backdrop-blur-md sticky top-0 z-30">
          <Logo size="sm" href="/dashboard" />
          <nav className="flex items-center gap-3 text-xs font-medium text-[#575E59]">
            <Link href="/dashboard" className="hover:text-[#1C1F1D]">
              Overview
            </Link>
            <Link href="/food" className="hover:text-[#1C1F1D]">
              Food
            </Link>
            <Link href="/nutrition" className="hover:text-[#1C1F1D]">
              Nutrition
            </Link>
            <Link href="/activity" className="hover:text-[#1C1F1D]">
              Activity
            </Link>
            <Link href="/progress" className="hover:text-[#1C1F1D]">
              Progress
            </Link>
          </nav>
        </div>

        {/* Dashboard Pages Shell */}
        <main className="flex-1 py-4 sm:py-6">
          <PageContainer size="wide">{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
