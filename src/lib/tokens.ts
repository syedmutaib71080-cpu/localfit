/**
 * LocalFit Design Tokens
 * Premium, minimal, Apple-inspired aesthetic
 * Cream & warm ivory backgrounds, sage & olive accents, dark charcoal typography
 */

export const tokens = {
  colors: {
    canvas: "#FAF8F5", // Warm Ivory base
    ivory: "#FDFCF9", // Subtle highlight
    cream: "#F5EFEB", // Warm cream surface
    surface: {
      default: "#FFFFFF",
      subtle: "#F9F7F2",
      cream: "#F5EFEB",
      muted: "#EFEBE1",
    },
    border: {
      subtle: "#E8E5DD",
      strong: "#D5D1C5",
      focus: "#437151",
    },
    charcoal: {
      950: "#121413",
      900: "#1C1F1D", // Primary text
      800: "#2C302D",
      700: "#3E4440",
      600: "#575E59", // Secondary text
      500: "#717A73", // Muted text
      400: "#939D95",
      300: "#BBC2BC",
      200: "#D9DDD9",
      100: "#EAECE9",
      50: "#F4F6F4",
    },
    sage: {
      50: "#F3F7F4",
      100: "#E2ECE4",
      200: "#C7DBD0",
      300: "#A3C3AF",
      400: "#7DA98C",
      500: "#568B66",
      600: "#437151", // Primary brand accent
      700: "#375A41",
      800: "#2E4835",
      900: "#263B2C",
    },
    olive: {
      50: "#F7F8F2",
      100: "#EDF0DF",
      200: "#DBE0C1",
      300: "#C2CBA0",
      400: "#A5AF7D",
      500: "#88935D",
      600: "#6B7546", // Secondary muted olive accent
      700: "#545B37",
      800: "#43492D",
      900: "#383D26",
    },
  },
  typography: {
    fontSans:
      'var(--font-sans), -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontMono:
      'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    tracking: {
      tighter: "-0.035em",
      tight: "-0.02em",
      normal: "0em",
      wide: "0.025em",
    },
  },
  spacing: {
    pagePadding: "px-4 sm:px-6 lg:px-8",
    sectionGap: "gap-6 lg:gap-8",
    containerMaxWidth: "max-w-7xl",
  },
  radii: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadows: {
    subtle: "0 1px 2px 0 rgba(28, 31, 29, 0.04)",
    card: "0 1px 3px 0 rgba(28, 31, 29, 0.05), 0 1px 2px -1px rgba(28, 31, 29, 0.05)",
    floating: "0 4px 12px 0 rgba(28, 31, 29, 0.06)",
  },
} as const;

export type ThemeTokens = typeof tokens;
