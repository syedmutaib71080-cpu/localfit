import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "sage" | "olive" | "neutral" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "sage",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    sage: "bg-[#E2ECE4] text-[#263B2C] border border-[#C7DBD0]",
    olive: "bg-[#EDF0DF] text-[#43492D] border border-[#DBE0C1]",
    neutral: "bg-[#F5EFEB] text-[#2C302D] border border-[#E8E5DD]",
    outline: "bg-white text-[#575E59] border border-[#E8E5DD]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] font-medium rounded-full",
    md: "px-2.5 py-1 text-xs font-medium rounded-full",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
