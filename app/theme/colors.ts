/**
 * Pi Manager Light Theme Colors
 * 
 * Semantic tokens for IoT dashboard with modern, vibrant palette.
 * Replace Ignite default browns/beiges with cool gray/indigo tones.
 */

const palette = {
  // Neutral scale (cool gray, not warm beige)
  neutral100: "#FFFFFF",
  neutral200: "#F1F5F9",
  neutral300: "#E2E8F0",
  neutral400: "#CBD5E1",
  neutral500: "#64748B",
  neutral600: "#475569",
  neutral700: "#334155",
  neutral800: "#1E293B",
  neutral900: "#0F172A",

  // Primary (indigo)
  primary100: "#EEF2FF",
  primary200: "#C7D2FE",
  primary300: "#A5B4FC",
  primary400: "#818CF8",
  primary500: "#6366F1",
  primary600: "#4F46E5",

  // Secondary (slate for contrast)
  secondary100: "#F1F5F9",
  secondary200: "#E2E8F0",
  secondary300: "#CBD5E1",
  secondary400: "#94A3B8",
  secondary500: "#64748B",

  // Accent (violet for special highlights)
  accent100: "#F5F3FF",
  accent200: "#DDD6FE",
  accent300: "#C4B5FD",
  accent400: "#A78BFA",
  accent500: "#8B5CF6",

  // Success (emerald)
  success100: "#ECFDF5",
  success500: "#10B981",

  // Warning (amber)
  warning100: "#FFFBEB",
  warning500: "#F59E0B",

  // Error (red)
  error100: "#FEF2F2",
  error500: "#EF4444",

  // Info (blue)
  info100: "#EFF6FF",
  info500: "#3B82F6",

  // Overlays
  overlay10: "rgba(15, 23, 42, 0.1)",
  overlay20: "rgba(15, 23, 42, 0.2)",
  overlay50: "rgba(15, 23, 42, 0.5)",
} as const

export const colors = {
  /**
   * Raw palette available for rare one-off cases.
   * Prefer semantic names below.
   */
  palette,

  // === Semantic Tokens ===

  /**
   * Screen backgrounds (cool gray, not warm beige)
   */
  background: "#F0F2F5",

  /**
   * Card backgrounds, elevated surfaces
   */
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  /**
   * Primary text
   */
  text: "#1E293B",

  /**
   * Secondary text, labels, captions
   */
  textDim: "#64748B",

  /**
   * Card borders, dividers (subtle, not heavy)
   */
  border: "#E2E8F0",

  /**
   * Primary action color (indigo)
   */
  tint: "#6366F1",

  /**
   * Inactive/disabled tint
   */
  tintDim: "#A5B4FC",

  /**
   * Connected, healthy, good values
   */
  success: "#10B981",

  /**
   * Loading, caution, moderate values
   */
  warning: "#F59E0B",

  /**
   * Disconnected, errors, critical values
   */
  error: "#EF4444",

  /**
   * Informational badges, links
   */
  info: "#3B82F6",

  // === Utility ===

  transparent: "rgba(0, 0, 0, 0)",
  separator: "#E2E8F0",
  errorBackground: "#FEF2F2",
  tintInactive: "#A5B4FC",
} as const

export type Colors = typeof colors
