import { FC, useEffect, useRef } from "react"
import { View, ViewStyle, Animated } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface SkeletonLoaderProps {
  /** Width of the skeleton (number or percentage string) */
  width?: number | string
  /** Height of the skeleton */
  height?: number
  /** Border radius */
  borderRadius?: number
  /** Style overrides */
  style?: ViewStyle
}

export const SkeletonLoader: FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const { theme } = useAppTheme()
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [animatedValue])

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        $skeleton,
        {
          width: width as number | `${number}%`,
          height,
          borderRadius,
          backgroundColor: theme.colors.palette.neutral300,
          opacity,
        },
        style,
      ]}
    />
  )
}

const $skeleton: ViewStyle = {
  backgroundColor: "#E2E8F0",
}
