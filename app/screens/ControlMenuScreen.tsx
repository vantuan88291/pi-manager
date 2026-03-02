import { FC } from "react"
import { View, ViewStyle, Alert } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { FeatureCard } from "@/components/FeatureCard"
import { useAppTheme } from "@/theme/context"
import { featureColors, getFeatureColor } from "@/theme/featureColors"
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

export const ControlMenuScreen: FC<ControlMenuScreenProps> = function ControlMenuScreen({ navigation }) {
  const { themed, theme } = useAppTheme()

  // Get theme-aware feature colors
  const getMenuIcon = (feature: keyof typeof featureColors) => {
    const { accent, badgeLight, badgeDark } = featureColors[feature]
    return {
      accent,
      badgeBg: theme.isDark ? badgeDark : badgeLight,
    }
  }

  const wifiColors = getMenuIcon("wifi")
  const btColors = getMenuIcon("bluetooth")
  const audioColors = getMenuIcon("audio")
  const cameraColors = getMenuIcon("camera")
  const storageColors = getMenuIcon("storage")

  const MENU_ITEMS: MenuItem[] = [
    { id: "wifi", title: "Wi-Fi", subtitle: "Disconnected", icon: { font: "Ionicons", name: "wifi", color: wifiColors.accent, badgeBg: wifiColors.badgeBg }, accentColor: wifiColors.accent, screen: "Wifi" },
    { id: "bluetooth", title: "Bluetooth", subtitle: "Off", icon: { font: "Ionicons", name: "bluetooth", color: btColors.accent, badgeBg: btColors.badgeBg }, accentColor: btColors.accent, screen: "Bluetooth" },
    { id: "audio", title: "Audio", subtitle: "Vol: 75%", icon: { font: "Ionicons", name: "volume-high", color: audioColors.accent, badgeBg: audioColors.badgeBg }, accentColor: audioColors.accent, screen: "Audio" },
    { id: "camera", title: "Camera", subtitle: "Offline", icon: { font: "Ionicons", name: "camera", color: cameraColors.accent, badgeBg: cameraColors.badgeBg }, accentColor: cameraColors.accent, screen: "Camera" },
    { id: "storage", title: "Storage", subtitle: "Wear: 2%", icon: { font: "MaterialCommunityIcons", name: "harddisk", color: storageColors.accent, badgeBg: storageColors.badgeBg }, accentColor: storageColors.accent, screen: "Storage" },
    { id: "reboot", title: "Reboot", subtitle: "Restart device", icon: { font: "Ionicons", name: "refresh", color: theme.colors.error, badgeBg: theme.isDark ? "#7F1D1D" : "#FEF2F2" }, accentColor: theme.colors.error, danger: true, action: () => {
      Alert.alert("Reboot", "Are you sure you want to reboot the device?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reboot", style: "destructive", onPress: () => console.log("Reboot requested") },
      ])
    }},
  ]

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
