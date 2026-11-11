"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Utensils,
  Apple,
  Activity,
  Dumbbell,
  TrendingUp,
  User,
  Settings,
  Scan,
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { demoUserProfile } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { title: "Food Tracker", href: "/app/food", icon: Utensils },
  { title: "Regional Foods", href: "/app/regional", icon: Compass },
  { title: "Nutrition", href: "/app/nutrition", icon: Apple },
  { title: "Activity", href: "/app/activity", icon: Activity },
  { title: "Workouts", href: "/app/workouts", icon: Dumbbell },
  { title: "Progress", href: "/app/progress", icon: TrendingUp },
  { title: "Profile", href: "/app/profile", icon: User },
  { title: "Settings", href: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [userName, setUserName] = React.useState(demoUserProfile.name);
  const [isLiveUser, setIsLiveUser] = React.useState(false);

  React.useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsLiveUser(true);
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
          } else if (user.email) {
            setUserName(user.email.split("@")[0]);
          }
        }
      } catch {
        // Fallback to demo
      }
    }

    checkAuth();
  }, []);

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AM";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-[#E8E5DD] bg-[#FAF8F5] transition-all duration-200 ease-in-out shrink-0 select-none z-20",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Top Header with Logo & Collapse Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#E8E5DD]">
        {!collapsed ? (
          <Logo size="md" href="/app/dashboard" />
        ) : (
          <div className="mx-auto">
            <Logo size="sm" href="/app/dashboard" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E5DD] bg-white text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#F5EFEB] transition-colors",
            collapsed && "hidden"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar collapse"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Quick Action: Food Scanner Shortcut */}
      <div className="p-3">
        <Link
          href="/app/food/scan"
          className={cn(
            "flex items-center gap-2.5 rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] px-3 py-2 text-xs font-semibold text-[#263B2C] shadow-sm hover:bg-[#C7DBD0] transition-colors",
            collapsed && "justify-center px-2"
          )}
          title="AI Food Scanner"
        >
          <Scan size={16} className="text-[#375A41] shrink-0" />
          {!collapsed && <span>AI Food Scanner</span>}
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Main Menu
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/app/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-[#E2ECE4] text-[#263B2C] font-semibold"
                  : "text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#F5EFEB]"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0",
                  isActive ? "text-[#375A41]" : "text-[#717A73]"
                )}
              />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Prototype Badge */}
      <div className="border-t border-[#E8E5DD] p-3 space-y-2">
        {!collapsed && (
          <Link
            href="/app/profile"
            className="block rounded-xl border border-[#E8E5DD] bg-white p-2.5 hover:bg-[#FAF8F5] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2ECE4] text-xs font-semibold text-[#375A41]">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#1C1F1D] truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-[#717A73] flex items-center gap-1">
                  {isLiveUser ? (
                    <>
                      <UserCheck size={10} className="text-[#375A41]" />
                      <span>Authenticated</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} className="text-[#6B7546]" />
                      <span>Demo Mode</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className={cn(
              "text-xs font-medium text-[#717A73] hover:text-[#1C1F1D] transition-colors",
              collapsed && "hidden"
            )}
          >
            ← Public Website
          </Link>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mx-auto p-1.5 text-[#575E59] hover:text-[#1C1F1D]"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
