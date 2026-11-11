import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "narrow" | "default" | "wide" | "full";
  as?: "div" | "main" | "section";
}

export function PageContainer({
  className,
  size = "default",
  as: Component = "div",
  children,
  ...props
}: PageContainerProps) {
  const sizeMap = {
    narrow: "max-w-4xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <Component
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10",
        sizeMap[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
