"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { NavigationItem } from "./navigation-item";
import { siteConfig } from "@/config/site";
import { IconMenu, IconX } from "@/components/ui/icons";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DD] bg-[#FAF8F5]/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Logo size="md" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 rounded-full border border-[#E8E5DD] bg-white/70 px-3 py-1 shadow-[0_1px_2px_rgba(28,31,29,0.03)]">
          {siteConfig.mainNav.map((item) => (
            <NavigationItem
              key={item.href}
              title={item.title}
              href={item.href}
              variant="pill"
            />
          ))}
        </nav>

        {/* Header Right Action */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#575E59] hover:text-[#1C1F1D] px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <Button href="/register" size="sm" variant="primary">
            Get Started
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E5DD] bg-white text-[#1C1F1D] focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E5DD] bg-[#FAF8F5] px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {siteConfig.mainNav.map((item) => (
              <NavigationItem
                key={item.href}
                title={item.title}
                href={item.href}
                variant="sidebar"
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </div>
          <div className="pt-3 border-t border-[#E8E5DD] flex flex-col gap-2">
            <Button
              href="/login"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Button>
            <Button
              href="/register"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
