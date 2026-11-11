"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavigationItemProps {
  title: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "pill" | "sidebar" | "underline";
}

export function NavigationItem({
  title,
  href,
  icon,
  badge,
  disabled,
  external,
  onClick,
  className,
  variant = "pill",
}: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

  const variantStyles = {
    // Pill style: Used in top header nav
    pill: cn(
      "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 flex items-center gap-2",
      isActive
        ? "bg-[#E2ECE4] text-[#263B2C] shadow-[0_1px_2px_rgba(28,31,29,0.04)]"
        : "text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#F5EFEB]/70"
    ),
    // Sidebar style: Used in app dashboard sidebar
    sidebar: cn(
      "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-between w-full",
      isActive
        ? "bg-[#E2ECE4] text-[#263B2C] font-semibold"
        : "text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#F5EFEB]"
    ),
    // Underline style
    underline: cn(
      "py-2 text-sm font-medium border-b-2 transition-colors duration-150 flex items-center gap-2",
      isActive
        ? "border-[#437151] text-[#1C1F1D]"
        : "border-transparent text-[#575E59] hover:text-[#1C1F1D] hover:border-[#D5D1C5]"
    ),
  };

  const content = (
    <span className="flex items-center gap-2.5">
      {icon && (
        <span
          className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-[#375A41]" : "text-[#717A73]"
          )}
        >
          {icon}
        </span>
      )}
      <span>{title}</span>
    </span>
  );

  const badgeElement = badge !== undefined && (
    <span
      className={cn(
        "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
        isActive
          ? "bg-[#437151] text-white"
          : "bg-[#F5EFEB] text-[#575E59] border border-[#E8E5DD]"
      )}
    >
      {badge}
    </span>
  );

  const combinedClasses = cn(
    "select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#437151] focus-visible:ring-offset-1",
    disabled && "opacity-40 pointer-events-none",
    variantStyles[variant],
    className
  );

  if (disabled) {
    return (
      <span className={combinedClasses} aria-disabled="true">
        {content}
        {badgeElement}
      </span>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={combinedClasses}
      >
        {content}
        {badgeElement}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={combinedClasses}>
      {content}
      {badgeElement}
    </Link>
  );
}
