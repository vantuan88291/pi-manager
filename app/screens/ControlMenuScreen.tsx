import { FC } from "react"
import { View, ViewStyle, Alert } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { FeatureCard } from "@/components/FeatureCard"
import { useAppTheme } from "@/theme/context"
import { featureColors } from "@/theme/featureColors"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"

type ControlMenuScreenProps = MainTabScreenProps<"Control">

interface MenuItem {
  id: string
  title: string
  subtitle?: string
  icon: { font: "Ionicons" | "MaterialCommunityIcons"; name: string; color: string; badgeBg: string }
  accentColor: string
  danger?: boolean
  screen?: "Wifi" | "Bluetooth" | "Audio" | "Camera" | "Storage"
  action?: () => void
}

const MENU_ITEMS: MenuItem[] = [
  { id: "wifi", title: "Wi-Fi", subtitle: "Disconnected", icon: { font: "Ionicons", name: "wifi", color: featureColors.wifi.accent, badgeBg: featureColors.wifi.badgeLight }, accentColor: featureColors.wifi.accent, screen: "Wifi" },
  { id: "bluetooth", title: "Bluetooth", subtitle: "Off", icon: { font: "Ionicons", name: "bluetooth", color: featureColors.bluetooth.accent, badgeBg: featureColors.bluetooth.badgeLight }, accentColor: featureColors.bluetooth.accent, screen: "Bluetooth" },
  { id: "audio", title: "Audio", subtitle: "Vol: 75%", icon: { font: "Ionicons", name: "volume-high", color: featureColors.audio.accent, badgeBg: featureColors.audio.badgeLight }, accentColor: featureColors.audio.accent, screen: "Audio" },
  { id: "camera", title: "Camera", subtitle: "Offline", icon: { font: "Ionicons", name: "camera", color: featureColors.camera.accent, badgeBg: featureColors.camera.badgeLight }, accentColor: featureColors.camera.accent, screen: "Camera" },
  { id: "storage", title: "Storage", subtitle: "Wear: 2%", icon: { font: "MaterialCommunityIcons", name: "harddisk", color: featureColors.storage.accent, badgeBg: featureColors.storage.badgeLight }, accentColor: featureColors.storage.accent, screen: "Storage" },
  { id: "reboot", title: "Reboot", subtitle: "Restart device", icon: { font: "Ionicons", name: "refresh", color: "#EF4444", badgeBg: "#FEF2F2" }, accentColor: "#EF4444", danger: true, action: () => {
    Alert.alert("Reboot", "Are you sure you want to reboot the device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reboot", style: "destructive", onPress: () => console.log("Reboot requested") },
    ])
  }},
]

export const ControlMenuScreen: FC<ControlMenuScreenProps> = function ControlMenuScreen({ navigation }) {
  const { themed } = useAppTheme()

  const handlePress = (item: MenuItem) => {
    if (item.screen) {
      navigation.navigate(item.screen)
    } else if (item.action) {
      item.action()
    }
  }

  return (
    <Screen preset="scroll">
      <Header title="Control" titleMode="center" />

      <View style={$gridContainer}>
        {MENU_ITEMS.map((item) => (
          <View key={item.id} style={themed($cardWrapper)}>
            <FeatureCard
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              accentColor={item.accentColor}
              danger={item.danger}
              onPress={() => handlePress(item)}
            />
          </View>
        ))}
      </View>
    </Screen>
  )
}

const $gridContainer: ViewStyle = { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16 }
const $cardWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({ width: "48%", marginBottom: spacing.md })
