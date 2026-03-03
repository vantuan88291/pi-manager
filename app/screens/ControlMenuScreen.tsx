import { FC } from "react"
import { View, ViewStyle, Alert } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { FeatureCard } from "@/components/FeatureCard"
import { useAppTheme } from "@/theme/context"
import { featureColors } from "@/theme/featureColors"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"
import { TxKeyPath } from "@/i18n"

type ControlMenuScreenProps = MainTabScreenProps<"Control">

interface MenuItem {
  id: string
  titleTx: TxKeyPath
  subtitleTx?: TxKeyPath
  subtitleParams?: Record<string, string | number>
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
    { 
      id: "wifi", 
      titleTx: "controlMenu:wifi", 
      subtitleTx: "controlMenu:subtitles.wifiDisconnected",
      icon: { font: "Ionicons", name: "wifi", color: wifiColors.accent, badgeBg: wifiColors.badgeBg }, 
      accentColor: wifiColors.accent, 
      screen: "Wifi" 
    },
    { 
      id: "bluetooth", 
      titleTx: "controlMenu:bluetooth", 
      subtitleTx: "controlMenu:subtitles.bluetoothOff",
      icon: { font: "Ionicons", name: "bluetooth", color: btColors.accent, badgeBg: btColors.badgeBg }, 
      accentColor: btColors.accent, 
      screen: "Bluetooth" 
    },
    { 
      id: "audio", 
      titleTx: "controlMenu:audio", 
      subtitleTx: "controlMenu:subtitles.audioVolume",
      subtitleParams: { volume: 75 },
      icon: { font: "Ionicons", name: "volume-high", color: audioColors.accent, badgeBg: audioColors.badgeBg }, 
      accentColor: audioColors.accent, 
      screen: "Audio" 
    },
    { 
      id: "camera", 
      titleTx: "controlMenu:camera", 
      subtitleTx: "controlMenu:subtitles.cameraOffline",
      icon: { font: "Ionicons", name: "camera", color: cameraColors.accent, badgeBg: cameraColors.badgeBg }, 
      accentColor: cameraColors.accent, 
      screen: "Camera" 
    },
    { 
      id: "storage", 
      titleTx: "controlMenu:storage", 
      subtitleTx: "controlMenu:subtitles.storageWear",
      subtitleParams: { percent: 2 },
      icon: { font: "MaterialCommunityIcons", name: "harddisk", color: storageColors.accent, badgeBg: storageColors.badgeBg }, 
      accentColor: storageColors.accent, 
      screen: "Storage" 
    },
    { 
      id: "reboot", 
      titleTx: "controlMenu:reboot", 
      subtitleTx: "common:ok",
      icon: { font: "Ionicons", name: "refresh", color: theme.colors.error, badgeBg: theme.isDark ? "#7F1D1D" : "#FEF2F2" }, 
      accentColor: theme.colors.error, 
      danger: true, 
      action: () => {
        Alert.alert(
          "reboot:title",
          "reboot:message",
          [
            { text: "common:cancel", style: "cancel" },
            { text: "reboot:confirm", style: "destructive", onPress: () => console.log("Reboot requested") },
          ]
        )
      }
    },
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
      <Header titleTx="controlMenu:title" titleMode="center" />

      <View style={$gridContainer}>
        {MENU_ITEMS.map((item) => (
          <View key={item.id} style={themed($cardWrapper)}>
            <FeatureCard
              titleTx={item.titleTx}
              subtitleTx={item.subtitleTx}
              subtitleParams={item.subtitleParams}
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
