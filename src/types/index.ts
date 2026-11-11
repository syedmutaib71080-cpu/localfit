import type { ReactNode } from "react";

export type Variant = "primary" | "secondary" | "outline" | "ghost" | "muted";
export type Size = "sm" | "md" | "lg";

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface NavigationItemProps {
  title: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
  isActive?: boolean;
  disabled?: boolean;
  external?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface SectionHeadingProps extends BaseProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  centered?: boolean;
}

export interface EmptyStateProps extends BaseProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export interface LoadingStateProps extends BaseProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
}

export interface PageContainerProps extends BaseProps {
  size?: "sm" | "md" | "lg" | "full";
  as?: "div" | "main" | "section";
}

export * from "./demo-data";
export * from "./activity";
export * from "./nutrition-tracking";

