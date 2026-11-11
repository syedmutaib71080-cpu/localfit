"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Scan, Settings, Dumbbell, TrendingUp } from "lucide-react";
import { DEMO_DATA_TAG } from "@/lib/demo-data";

export function AppHeader() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.includes("/food/scan")) return "AI Food Scanner";
    if (pathname.includes("/food")) return "Food Tracker";
    if (pathname.includes("/nutrition")) return "Nutrition Intelligence";
    if (pathname.includes("/activity")) return "Activity Tracking";
    if (pathname.includes("/workouts")) return "Workouts";
    if (pathname.includes("/progress")) return "Progress & Trends";
    if (pathname.includes("/profile")) return "Profile";
    if (pathname.includes("/settings")) return "Settings";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E8E5DD] bg-[#FAF8F5]/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Mobile Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Logo size="sm" href="/app/dashboard" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1F1D]">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Top Demo Banner Indicator */}
      <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#437151] animate-pulse" />
        <span>{DEMO_DATA_TAG}</span>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-2">
        <Link
          href="/app/food/scan"
          className="flex h-9 items-center gap-1.5 rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] px-3 text-xs font-semibold text-[#263B2C] hover:bg-[#C7DBD0] transition-colors"
          title="Open AI Food Scanner"
        >
          <Scan size={15} />
          <span className="hidden sm:inline">Scan Food</span>
        </Link>

        <Link
          href="/app/workouts"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E5DD] bg-white text-[#575E59] hover:text-[#1C1F1D]"
          title="Workouts"
        >
          <Dumbbell size={16} />
        </Link>

        <Link
          href="/app/progress"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E5DD] bg-white text-[#575E59] hover:text-[#1C1F1D]"
          title="Progress"
        >
          <TrendingUp size={16} />
        </Link>

        <Link
          href="/app/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E5DD] bg-white text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#F5EFEB] transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </Link>
      </div>
    </header>
  );
}
