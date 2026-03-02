/**
 * Pi Manager Dark Theme Colors
 * 
 * Semantic tokens for IoT dashboard with modern, vibrant palette.
 * Dark-first design - this is the default theme for Pi Manager.
 */

const palette = {
  // Neutral scale (cool gray, not warm beige)
  neutral100: "#0F172A",
  neutral200: "#1E293B",
  neutral300: "#334155",
  neutral400: "#475569",
  neutral500: "#64748B",
  neutral600: "#94A3B8",
  neutral700: "#CBD5E1",
  neutral800: "#E2E8F0",
  neutral900: "#F8FAFC",

  // Primary (indigo)
  primary100: "#312E81",
  primary200: "#3730A3",
  primary300: "#4F46E5",
  primary400: "#6366F1",
  primary500: "#818CF8",
  primary600: "#A5B4FC",

  // Secondary (slate for contrast)
  secondary100: "#1E293B",
  secondary200: "#334155",
  secondary300: "#475569",
  secondary400: "#64748B",
  secondary500: "#94A3B8",

  // Accent (violet for special highlights)
  accent100: "#4C1D95",
  accent200: "#5B21B6",
  accent300: "#6D28D9",
  accent400: "#7C3AED",
  accent500: "#8B5CF6",

  // Success (emerald)
  success100: "#064E3B",
  success500: "#34D399",

  // Warning (amber)
  warning100: "#78350F",
  warning500: "#FBBF24",

  // Error (red)
  error100: "#7F1D1D",
  error500: "#F87171",

  // Info (blue)
  info100: "#1E3A5F",
  info500: "#60A5FA",

  // Overlays
  overlay10: "rgba(0, 0, 0, 0.1)",
  overlay20: "rgba(0, 0, 0, 0.2)",
  overlay50: "rgba(0, 0, 0, 0.5)",
} as const

export const colors = {
  /**
   * Raw palette available for rare one-off cases.
   * Prefer semantic names below.
   */
  palette,

  // === Semantic Tokens ===

  /**
   * Screen backgrounds (deep blue-black)
   */
  background: "#0F172A",

  /**
   * Card backgrounds
   */
  surface: "#1E293B",
  surfaceElevated: "#334155",

  /**
   * Primary text
   */
  text: "#F1F5F9",

  /**
   * Secondary text, labels, captions
   */
  textDim: "#94A3B8",

  /**
   * Card borders, dividers (subtle, not heavy)
   */
  border: "#334155",

  /**
   * Primary action color (indigo)
   */
  tint: "#818CF8",

  /**
   * Inactive/disabled tint
   */
  tintDim: "rgba(99, 102, 241, 0.5)",

  /**
   * Connected, healthy, good values
   */
  success: "#34D399",

  /**
   * Loading, caution, moderate values
   */
  warning: "#FBBF24",

  /**
   * Disconnected, errors, critical values
   */
  error: "#F87171",

  /**
   * Informational badges, links
   */
  info: "#60A5FA",

  // === Utility ===

  transparent: "rgba(0, 0, 0, 0)",
  separator: "#334155",
  errorBackground: "#7F1D1D",
  tintInactive: "rgba(99, 102, 241, 0.5)",
} as const

export type Colors = typeof colors
