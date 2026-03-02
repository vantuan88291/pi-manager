/**
 * Pi Manager Feature Accent Colors
 * 
 * Each feature has a unique tint used for icon badges and highlights.
 * This prevents the "monotone dashboard" problem by giving each module
 * its own visual identity.
 */

export const featureColors = {
  cpu: {
    /** Accent color for icons and highlights */
    accent: "#6366F1",
    /** Light mode icon badge background */
    badgeLight: "#EEF2FF",
    /** Dark mode icon badge background */
    badgeDark: "#312E81",
  },
  temperature: {
    accent: "#F59E0B",
    badgeLight: "#FFFBEB",
    badgeDark: "#78350F",
  },
  memory: {
    accent: "#8B5CF6",
    badgeLight: "#F5F3FF",
    badgeDark: "#4C1D95",
  },
  disk: {
    accent: "#06B6D4",
    badgeLight: "#ECFEFF",
    badgeDark: "#164E63",
  },
  wifi: {
    accent: "#3B82F6",
    badgeLight: "#EFF6FF",
    badgeDark: "#1E3A5F",
  },
  bluetooth: {
    accent: "#6366F1",
    badgeLight: "#EEF2FF",
    badgeDark: "#312E81",
  },
  audio: {
    accent: "#EC4899",
    badgeLight: "#FDF2F8",
    badgeDark: "#831843",
  },
  camera: {
    accent: "#10B981",
    badgeLight: "#ECFDF5",
    badgeDark: "#064E3B",
  },
  storage: {
    accent: "#06B6D4",
    badgeLight: "#ECFEFF",
    badgeDark: "#164E63",
  },
  settings: {
    accent: "#64748B",
    badgeLight: "#F1F5F9",
    badgeDark: "#1E293B",
  },
  system: {
    accent: "#6366F1",
    badgeLight: "#EEF2FF",
    badgeDark: "#312E81",
  },
} as const

export type FeatureKey = keyof typeof featureColors

/**
 * Get feature colors with theme-aware badge background
 */
export function getFeatureColor(feature: FeatureKey, isDark: boolean) {
  const colors = featureColors[feature]
  return {
    accent: colors.accent,
    badge: isDark ? colors.badgeDark : colors.badgeLight,
  }
}
