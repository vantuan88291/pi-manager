import { FC, ReactNode } from "react"
import { View, ViewStyle, TextStyle, Pressable } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface SectionHeaderProps {
  /** Section title */
  title: string
  /** Optional right action button */
  rightAction?: {
    label: string
    onPress: () => void
  }
  /** Style overrides */
  style?: ViewStyle
}

export const SectionHeader: FC<SectionHeaderProps> = ({
  title,
  rightAction,
  style,
}) => {
  const { themed } = useAppTheme()

  return (
    <View style={[themed($container), style]}>
      <Text text={title} size="md" weight="semiBold" style={themed($title)} />
      {rightAction && (
        <Pressable onPress={rightAction.onPress} style={$action}>
          <Text text={rightAction.label} size="sm" color="tint" />
        </Pressable>
      )}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
})

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $action: ViewStyle = {
  paddingVertical: 4,
  paddingHorizontal: 8,
}
