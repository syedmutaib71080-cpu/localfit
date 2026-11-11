import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      className={cn(
        "rounded-full border-[#C7DBD0] border-t-[#437151] animate-spin",
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingState({
  label = "Loading...",
  size = "md",
  fullHeight = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-center select-none",
        fullHeight ? "min-h-[400px] flex-1" : "py-12",
        className
      )}
    >
      <LoadingSpinner size={size} />
      {label && (
        <p className="text-xs sm:text-sm font-medium text-[#717A73] tracking-tight">
          {label}
        </p>
      )}
    </div>
  );
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[#EFEBE1]/70",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E8E5DD] bg-white p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
