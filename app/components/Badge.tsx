import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

interface BadgeProps {
  text: string
  color?: string
  size?: "small" | "medium"
}

export const Badge: FC<BadgeProps> = function Badge({ text, color, size = "small" }) {
  const { theme } = useAppTheme()
  
  const badgeColor = color || theme.colors.palette.neutral400
  
  return (
    <View style={[
      $badge,
      { backgroundColor: badgeColor + "20", borderColor: badgeColor + "40" },
      size === "small" && $badgeSmall,
      size === "medium" && $badgeMedium,
    ]}>
      <Text text={text} size={size === "small" ? "xs" : "sm"} weight="semiBold" color={badgeColor} />
    </View>
  )
}

const $badge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  alignSelf: "flex-start",
}

const $badgeSmall: ViewStyle = {
  paddingHorizontal: 6,
  paddingVertical: 2,
}

const $badgeMedium: ViewStyle = {
  paddingHorizontal: 10,
  paddingVertical: 6,
}
