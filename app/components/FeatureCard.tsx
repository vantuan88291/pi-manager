import { FC } from "react"
import { Pressable, PressableProps, View, ViewStyle } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated"

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
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePressIn = () => { scale.value = withSpring(0.97) }
  const handlePressOut = () => { scale.value = withSpring(1) }

  const effectiveAccent = danger ? theme.colors.error : accentColor

  return (
    <AnimatedPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[themed($container), animatedStyle, style]} {...rest}>
      <View style={[$accentBar, { backgroundColor: effectiveAccent }]} />
      <View style={[$iconBadge, { backgroundColor: icon.badgeBg }]}>
        <Icon font={icon.font} icon={icon.name} color={icon.color} size={24} />
      </View>
      <Text text={title} size="sm" weight="semiBold" style={themed($title) as ViewStyle} />
      {subtitle && <Text text={subtitle} size="xs" color="textDim" style={$subtitle} />}
    </AnimatedPressable>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, height: 120, overflow: "hidden" })
const $accentBar: ViewStyle = { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 }
const $iconBadge: ViewStyle = { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 }
const $title = { color: "#1E293B" as any }
const $subtitle: ViewStyle = { marginTop: 2 }
