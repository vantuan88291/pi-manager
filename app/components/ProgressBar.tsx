import { FC } from "react"
import { View, ViewStyle, Animated } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ProgressBarProps {
  /** Progress value 0-100 */
  value: number
  /** Bar color (defaults to tint) */
  color?: string
  /** Track height (defaults to 6) */
  height?: number
  /** Style overrides */
  style?: ViewStyle
}

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  color,
  height = 6,
  style,
}) => {
  const { theme } = useAppTheme()
  const barColor = color ?? theme.colors.tint
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <View style={[$track, { height, backgroundColor: theme.colors.border }, style]}>
      <View
        style={[
          $fill,
          {
            height,
            backgroundColor: barColor,
            width: `${clampedValue}%`,
          },
        ]}
      />
    </View>
  )
}

const $track: ViewStyle = {
  borderRadius: 3,
  overflow: "hidden",
}

const $fill: ViewStyle = {
  borderRadius: 3,
}
