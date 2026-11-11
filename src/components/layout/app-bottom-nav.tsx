"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Utensils,
  Activity,
  Apple,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { title: "Food", href: "/app/food", icon: Utensils },
  { title: "Activity", href: "/app/activity", icon: Activity },
  { title: "Nutrition", href: "/app/nutrition", icon: Apple },
  { title: "Profile", href: "/app/profile", icon: User },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E5DD] bg-[#FAF8F5]/95 backdrop-blur-md px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/app/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] min-h-[48px]",
                isActive
                  ? "text-[#375A41] font-semibold"
                  : "text-[#717A73] hover:text-[#1C1F1D]"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isActive && "bg-[#E2ECE4]"
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
