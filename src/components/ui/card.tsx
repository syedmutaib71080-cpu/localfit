import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "cream" | "subtle" | "interactive";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  const variantStyles = {
    // Default: Clean white surface with subtle stone border
    default: "bg-[#FFFFFF] border-[#E8E5DD] shadow-[0_1px_3px_rgba(28,31,29,0.04)]",
    // Cream: Warm ivory/cream tinted surface
    cream: "bg-[#F5EFEB] border-[#E8E5DD]/80",
    // Subtle: Transparent surface with light border
    subtle: "bg-[#FAF8F5] border-[#E8E5DD]",
    // Interactive: Card with hover feedback
    interactive:
      "bg-[#FFFFFF] border-[#E8E5DD] shadow-[0_1px_3px_rgba(28,31,29,0.04)] hover:border-[#D5D1C5] hover:shadow-[0_4px_12px_rgba(28,31,29,0.06)] transition-all duration-200 cursor-pointer",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border text-[#1C1F1D]",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-[#1C1F1D]",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[#575E59] leading-relaxed", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center p-6 pt-0 text-sm text-[#575E59]",
        className
      )}
      {...props}
    />
  );
}
