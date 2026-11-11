import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function Logo({
  className,
  showTagline = false,
  size = "md",
  href = "/",
}: LogoProps) {
  const sizeMap = {
    sm: {
      mark: "h-7 w-7 text-xs",
      text: "text-lg",
      dot: "w-1.5 h-1.5",
    },
    md: {
      mark: "h-8 w-8 text-sm",
      text: "text-xl",
      dot: "w-2 h-2",
    },
    lg: {
      mark: "h-10 w-10 text-base",
      text: "text-2xl",
      dot: "w-2.5 h-2.5",
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      {/* Apple-inspired geometric emblem */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-[#E2ECE4] border border-[#C7DBD0] text-[#375A41] transition-transform duration-200 ease-out group-hover:scale-[1.02]",
          currentSize.mark
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[60%] h-[60%]"
        >
          {/* Stylized leaf & pulse mark */}
          <path d="M12 21a9 9 0 0 1-9-9c0-5 4-9 9-9 5 0 9 4 9 9a9 9 0 0 1-9 9Z" />
          <path d="M7 12h3l2-3 2 6 2-3h3" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={cn(
            "font-semibold tracking-[-0.03em] text-[#1C1F1D] leading-none flex items-center gap-1",
            currentSize.text
          )}
        >
          LocalFit
          <span className={cn("rounded-full bg-[#437151] inline-block", currentSize.dot)} />
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium text-[#717A73] tracking-normal mt-0.5">
            Vitality & Nutrition
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[#437151] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
