import { FC } from "react"
import { View, ViewStyle, Pressable } from "react-native"

import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface SettingsItem {
  id: string
  label: string
  value?: string
  icon: { font: "Ionicons" | "MaterialCommunityIcons"; name: string }
}

const SETTINGS_ITEMS: SettingsItem[] = [
  { id: "theme", label: "Theme", value: "Dark", icon: { font: "Ionicons", name: "moon" } },
  { id: "language", label: "Language", value: "English", icon: { font: "Ionicons", name: "globe" } },
  { id: "connection", label: "Connection", value: "Connected", icon: { font: "Ionicons", name: "link" } },
  { id: "about", label: "About", value: "v1.0.0", icon: { font: "Ionicons", name: "information-circle" } },
]

export const SettingsScreen: FC = function SettingsScreen() {
  const { themed, theme } = useAppTheme()

  return (
    <Screen preset="scroll">
      <Header title="Settings" titleMode="center" />

      <View style={themed($card)}>
        {SETTINGS_ITEMS.map((item, index) => (
          <Pressable key={item.id} style={themed([$settingsRow, index > 0 && $settingsDivider])}>
            <View style={themed($iconBadge)}>
              <Icon font={item.icon.font} icon={item.icon.name} color={theme.colors.textDim} size={20} />
            </View>
            <View style={$settingsContent}>
              <Text text={item.label} weight="medium" color="text" />
            </View>
            {item.value && (
              <View style={$settingsValue}>
                <Text text={item.value} color="textDim" size="sm" />
                <Icon font="Ionicons" icon="chevron-forward" color={theme.colors.textDim} size={20} />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={themed($appInfo)}>
        <Text text="Pi Manager" size="md" weight="semiBold" color="text" />
        <Text text="Remote management for Raspberry Pi" color="textDim" size="sm" />
        <Text text="© 2024" color="textDim" size="xs" style={$copyright} />
      </View>
    </Screen>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border, margin: spacing.md })
const $settingsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.md })
const $settingsDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border })
const $iconBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.palette.neutral200, alignItems: "center", justifyContent: "center", marginRight: 12 })
const $settingsContent: ViewStyle = { flex: 1 }
const $settingsValue: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 }
const $appInfo: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({ marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.lg })
const $copyright: ViewStyle = { marginTop: 8 }
