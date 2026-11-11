import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#E8E5DD] bg-[#FAF8F5] py-12 select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#E8E5DD]">
          <div>
            <Logo size="md" showTagline />
            <p className="mt-2 text-xs text-[#575E59] max-w-sm leading-relaxed">
              {siteConfig.description}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-xs text-[#575E59]">
            {siteConfig.mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-[#1C1F1D] transition-colors"
              >
                {item.title}
              </Link>
            ))}
            <Link
              href="/app/dashboard"
              className="hover:text-[#1C1F1D] transition-colors font-medium text-[#437151]"
            >
              App Portal
            </Link>
          </nav>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#717A73]">
          <p>© 2026 {siteConfig.name}. All rights reserved.</p>
          <p className="text-[11px] text-[#939D95]">
            Stage 1 Project Foundation • Next.js App Router
          </p>
        </div>
      </div>
    </footer>
  );
}
