"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { NavigationItem } from "./navigation-item";
import {
  IconDashboard,
  IconFood,
  IconNutrition,
  IconActivity,
  IconProgress,
  IconSparkles,
} from "@/components/ui/icons";

const dashboardNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <IconDashboard size={18} />,
  },
  {
    title: "Food Log",
    href: "/food",
    icon: <IconFood size={18} />,
  },
  {
    title: "Nutrition Intel",
    href: "/nutrition",
    icon: <IconNutrition size={18} />,
  },
  {
    title: "Activity",
    href: "/activity",
    icon: <IconActivity size={18} />,
  },
  {
    title: "Progress",
    href: "/progress",
    icon: <IconProgress size={18} />,
  },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-[#E8E5DD] bg-[#FAF8F5] p-5 shrink-0 select-none">
      {/* Top Logo */}
      <div className="pb-6 border-b border-[#E8E5DD]/70">
        <Logo size="md" href="/dashboard" showTagline />
      </div>

      {/* Main navigation list */}
      <div className="flex-1 py-6 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
          Platform
        </div>
        {dashboardNavItems.map((item) => (
          <NavigationItem
            key={item.href}
            title={item.title}
            href={item.href}
            icon={item.icon}
            variant="sidebar"
          />
        ))}
      </div>

      {/* Stage 1 Indicator & Foundations */}
      <div className="pt-4 border-t border-[#E8E5DD] space-y-3">
        <div className="rounded-xl border border-[#E8E5DD] bg-white p-3.5 shadow-[0_1px_2px_rgba(28,31,29,0.03)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#375A41]">
            <IconSparkles size={15} />
            <span>Stage 1: Foundation</span>
          </div>
          <p className="mt-1 text-[11px] text-[#575E59] leading-relaxed">
            Design tokens, route architecture & design system active.
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[#717A73] hover:text-[#1C1F1D] rounded-lg transition-colors"
        >
          <span>Return to website</span>
          <span>→</span>
        </Link>
      </div>
    </aside>
  );
}
