import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "olive";
  size?: "sm" | "md" | "lg";
  href?: string;
  external?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      href,
      external,
      isLoading = false,
      disabled,
      children,
      icon,
      iconPosition = "right",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#437151] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F5] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variantStyles = {
      // Primary: Sage green accent with crisp text
      primary:
        "bg-[#437151] text-[#FFFFFF] shadow-[0_1px_2px_rgba(28,31,29,0.08)] hover:bg-[#375A41] active:bg-[#2E4835]",
      // Secondary: Warm cream surface with charcoal text
      secondary:
        "bg-[#F5EFEB] text-[#1C1F1D] border border-[#E8E5DD] hover:bg-[#EFEBE1] active:bg-[#E5E0D5]",
      // Outline: Crisp white with subtle stone border
      outline:
        "bg-[#FFFFFF] text-[#1C1F1D] border border-[#E8E5DD] shadow-[0_1px_2px_rgba(28,31,29,0.03)] hover:border-[#D5D1C5] hover:bg-[#FAF8F5]",
      // Ghost: Subtle hover state
      ghost:
        "text-[#3E4440] hover:text-[#1C1F1D] hover:bg-[#F5EFEB]/70",
      // Olive accent variant
      olive:
        "bg-[#6B7546] text-[#FFFFFF] shadow-[0_1px_2px_rgba(28,31,29,0.08)] hover:bg-[#545B37] active:bg-[#43492D]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-2xl gap-2.5",
    };

    const classes = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    const content = (
      <>
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && icon && iconPosition === "left" && (
          <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!isLoading && icon && iconPosition === "right" && (
          <span className="shrink-0">{icon}</span>
        )}
      </>
    );

    if (href) {
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
          >
            {content}
          </a>
        );
      }
      return (
        <Link href={href} className={classes}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classes}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
