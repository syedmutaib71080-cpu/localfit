import * as React from "react";
import { cn } from "@/lib/utils";
import { IconInbox } from "./icons";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  variant?: "default" | "card" | "dashed";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const variantStyles = {
    default: "py-12 sm:py-16 text-center",
    card: "p-8 sm:p-12 rounded-2xl border border-[#E8E5DD] bg-white text-center shadow-[0_1px_3px_rgba(28,31,29,0.03)]",
    dashed:
      "p-8 sm:p-12 rounded-2xl border border-dashed border-[#D5D1C5] bg-[#FAF8F5]/60 text-center",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center max-w-md mx-auto select-none",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2ECE4] text-[#375A41] mb-4 border border-[#C7DBD0]">
        {icon || <IconInbox size={22} />}
      </div>

      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#1C1F1D]">
        {title}
      </h3>

      <p className="mt-1.5 text-xs sm:text-sm text-[#575E59] leading-relaxed max-w-sm">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
