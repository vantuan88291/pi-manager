import { FC } from "react"
import { Pressable, PressableProps, View, ViewStyle, TextStyle } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"

import { Icon, FontFamily } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface FeatureCardProps extends Omit<PressableProps, "style"> {
  title: string
  subtitle?: string
  icon: { font: FontFamily; name: string; color: string; badgeBg: string }
  accentColor: string
  danger?: boolean
  style?: ViewStyle
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const FeatureCard: FC<FeatureCardProps> = ({ title, subtitle, icon, accentColor, danger, style, onPress, ...rest }) => {
  const { themed, theme } = useAppTheme()
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  const handlePressIn = () => { opacity.value = withTiming(0.7, { duration: 100 }) }
  const handlePressOut = () => { opacity.value = withTiming(1, { duration: 100 }) }

  const effectiveAccent = danger ? theme.colors.error : accentColor

  return (
    <AnimatedPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[themed($container), animatedStyle, style]} {...rest}>
      <View style={[$iconBadge, { backgroundColor: icon.badgeBg }]}>
        <Icon font={icon.font} icon={icon.name} color={icon.color} size={28} />
      </View>
      <Text text={title} size="sm" weight="semiBold" style={themed($title)} />
      {subtitle && <Text text={subtitle} size="xs" color="textDim" style={themed($subtitle)} />}
    </AnimatedPressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, height: 140, overflow: "hidden", alignItems: "center", justifyContent: "center" })
const $iconBadge: ViewStyle = { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 }
const $title: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim, marginTop: 4 })
