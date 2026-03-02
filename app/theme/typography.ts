// TODO: write documentation about fonts and typography along with guides on how to add custom fonts in own
// markdown file and add links from here

import { Platform } from "react-native"
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from "@expo-google-fonts/space-grotesk"

export const customFontsToLoad = {
  spaceGroteskLight,
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
  spaceGroteskBold,
}

const fonts = {
  spaceGrotesk: {
    // Cross-platform Google font.
    light: "spaceGroteskLight",
    normal: "spaceGroteskRegular",
    medium: "spaceGroteskMedium",
    semiBold: "spaceGroteskSemiBold",
    bold: "spaceGroteskBold",
  },
  helveticaNeue: {
    // iOS only font.
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    // iOS only font.
    normal: "Courier",
  },
  sansSerif: {
    // Android only font.
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
  },
  monospace: {
    // Android only font.
    normal: "monospace",
  },
}

/**
 * Typography size presets for Pi Manager
 * 
 * These semantic sizes should be used consistently across the app.
 * Each size maps to a specific font size and weight for a consistent look.
 */
export const sizes = {
  /** 24px - Screen titles (Dashboard, Wi-Fi...) */
  screenTitle: 24,
  /** 18px - Section headings inside screens */
  sectionTitle: 18,
  /** 16px - Card headings */
  cardTitle: 16,
  /** 14px - General text, descriptions */
  body: 14,
  /** 12px - Timestamps, secondary info */
  caption: 12,
  /** 32px - Large stat numbers (CPU 45%) */
  stat: 32,
  /** 14px - Units next to stats (%, °C, MB) */
  statUnit: 14,
} as const

/**
 * Typography weight presets
 */
export const weights = {
  /** 300 */
  light: "300" as const,
  /** 400 */
  regular: "400" as const,
  /** 500 */
  medium: "500" as const,
  /** 600 */
  semiBold: "600" as const,
  /** 700 */
  bold: "700" as const,
} as const

export const typography = {
  /**
   * The fonts are available to use, but prefer using the semantic name.
   */
  fonts,
  /**
   * The primary font. Used in most places.
   */
  primary: fonts.spaceGrotesk,
  /**
   * An alternate font used for perhaps titles and stuff.
   */
  secondary: Platform.select({ ios: fonts.helveticaNeue, android: fonts.sansSerif }),
  /**
   * Lets get fancy with a monospace font!
   */
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
  /**
   * Semantic size presets
   */
  sizes,
  /**
   * Weight presets
   */
  weights,
}

export type Typography = typeof typography
