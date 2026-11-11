import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FAF8F5] text-[#1C1F1D]">
      {/* Desktop Fixed / Collapsible Sidebar */}
      <React.Suspense fallback={<aside className="hidden lg:flex w-64 border-r border-[#E8E5DD] bg-[#FAF8F5] shrink-0" />}>
        <AppSidebar />
      </React.Suspense>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <React.Suspense fallback={<header className="h-16 border-b border-[#E8E5DD] bg-[#FAF8F5]" />}>
          <AppHeader />
        </React.Suspense>

        {/* Scrollable Viewport with safe mobile bottom spacing */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-12">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <React.Suspense fallback={null}>
          <AppBottomNav />
        </React.Suspense>
      </div>
    </div>
  );
}
