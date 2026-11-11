import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  centered = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:gap-2",
        action ? "sm:flex-row sm:items-end sm:justify-between" : undefined,
        centered ? "text-center items-center" : undefined,
        className
      )}
    >
      <div className={cn("space-y-1", centered && "max-w-2xl mx-auto")}>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7546]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#1C1F1D] leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm sm:text-base text-[#575E59] leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2 sm:mt-0 shrink-0">{action}</div>}
    </div>
  );
}
