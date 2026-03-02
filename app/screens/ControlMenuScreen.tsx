import { FC } from "react"
import type { TextStyle } from "react-native"
import { ScrollView, View, ViewStyle } from "react-native"

import { FeatureCard } from "@/components/FeatureCard"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface MenuItem {
  id: string
  title: string
  subtitle?: string
  icon: { font: "Ionicons" | "MaterialCommunityIcons"; name: string; color: string; badgeBg: string }
  accentColor: string
  danger?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  { id: "wifi", title: "Wi-Fi", subtitle: "Disconnected", icon: { font: "Ionicons", name: "wifi", color: "#3B82F6", badgeBg: "#EFF6FF" }, accentColor: "#3B82F6" },
  { id: "bluetooth", title: "Bluetooth", subtitle: "Off", icon: { font: "Ionicons", name: "bluetooth", color: "#6366F1", badgeBg: "#EEF2FF" }, accentColor: "#6366F1" },
  { id: "audio", title: "Audio", subtitle: "Vol: 75%", icon: { font: "Ionicons", name: "volume-high", color: "#EC4899", badgeBg: "#FDF2F8" }, accentColor: "#EC4899" },
  { id: "camera", title: "Camera", subtitle: "Offline", icon: { font: "Ionicons", name: "camera", color: "#10B981", badgeBg: "#ECFDF5" }, accentColor: "#10B981" },
  { id: "storage", title: "Storage", subtitle: "Wear: 2%", icon: { font: "MaterialCommunityIcons", name: "harddisk", color: "#06B6D4", badgeBg: "#ECFEFF" }, accentColor: "#06B6D4" },
  { id: "reboot", title: "Reboot", subtitle: "Restart device", icon: { font: "Ionicons", name: "refresh", color: "#EF4444", badgeBg: "#FEF2F2" }, accentColor: "#EF4444", danger: true },
]

export const ControlMenuScreen: FC = function ControlMenuScreen() {
  const { themed } = useAppTheme()

  return (
    <View style={themed($container)}>
      <View style={themed($header)}>
        <Text text="Control" size="lg" weight="bold" style={themed($headerTitle)} />
      </View>

      <ScrollView contentContainerStyle={themed($scrollContent)}>
        <View style={$gridContainer}>
          {MENU_ITEMS.map((item) => (
            <View key={item.id} style={themed($cardWrapper)}>
              <FeatureCard title={item.title} subtitle={item.subtitle} icon={item.icon} accentColor={item.accentColor} danger={item.danger} onPress={() => console.log(`Pressed ${item.id}`)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({ flex: 1, backgroundColor: colors.background })
const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border })
const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.text })
const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $gridContainer: ViewStyle = { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }
const $cardWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({ width: "48%", marginBottom: spacing.md })
