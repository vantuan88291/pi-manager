import { FC, useState, useEffect } from "react"
import { View, ViewStyle, Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { useNavigation } from "@react-navigation/native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { FeatureCard } from "@/components/FeatureCard"
import { useAppTheme } from "@/theme/context"
import { featureColors } from "@/theme/featureColors"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"
import { useSocket } from "@/services/socket/SocketContext"
import { wifiClientModule } from "@/services/socket/modules/wifi"
import { bluetoothClientModule } from "@/services/socket/modules/bluetooth"
import { audioClientModule } from "@/services/socket/modules/audio"
import { storageClientModule } from "@/services/socket/modules/storage"

type ControlMenuScreenProps = MainTabScreenProps<"Control">

interface MenuItem {
  id: string
  titleTx: string
  subtitleTx?: string
  subtitleParams?: Record<string, string | number>
  icon: { font: "Ionicons" | "MaterialCommunityIcons"; name: string; color: string; badgeBg: string }
  accentColor: string
  danger?: boolean
  screen?: "Wifi" | "Bluetooth" | "Audio" | "Camera" | "Storage" | "CronJob"
  action?: () => void
}

export const ControlMenuScreen: FC<ControlMenuScreenProps> = function ControlMenuScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  // Real-time status states
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; ssid?: string }>({ connected: false })
  const [btStatus, setBtStatus] = useState<{ powered: boolean; connectedCount: number }>({ powered: false, connectedCount: 0 })
  const [audioStatus, setAudioStatus] = useState<{ volume: number; muted: boolean }>({ volume: 75, muted: false })
  const [storageStatus, setStorageStatus] = useState<{ healthPercent: number }>({ healthPercent: 0 })

  // Subscribe to all modules
  useEffect(() => {
    subscribeToModule("wifi")
    subscribeToModule("bluetooth")
    subscribeToModule("audio")
    subscribeToModule("storage")
    
    // Request initial status from all modules
    wifiClientModule.requestStatus()
    bluetoothClientModule.requestStatus()
    audioClientModule.requestStatus()
    storageClientModule.requestStatus()
    
    const unsubWifi = wifiClientModule.onStatus((status) => {
      setWifiStatus({
        connected: status.connected,
        ssid: status.ssid || undefined,
      })
    })
    
    const unsubBt = bluetoothClientModule.onStatus((status) => {
      const connectedCount = status.devices?.filter(d => d.connected).length || 0
      setBtStatus({
        powered: status.powered,
        connectedCount,
      })
    })
    
    const unsubAudio = audioClientModule.onStatus((status) => {
      setAudioStatus({
        volume: status.volume,
        muted: status.muted,
      })
    })
    
    const unsubStorage = storageClientModule.onStatus((status) => {
      setStorageStatus({
        healthPercent: status.health?.percentageUsed || 0,
      })
    })
    
    return () => {
      unsubWifi()
      unsubBt()
      unsubAudio()
      unsubStorage()
      unsubscribeFromModule("wifi")
      unsubscribeFromModule("bluetooth")
      unsubscribeFromModule("audio")
      unsubscribeFromModule("storage")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const getWifiColors = getMenuIcon("wifi")
  const btColors = getMenuIcon("bluetooth")
  const audioColors = getMenuIcon("audio")
  const cameraColors = getMenuIcon("camera")
  const storageColors = getMenuIcon("storage")

  function getMenuIcon(feature: keyof typeof featureColors) {
    const { accent, badgeLight, badgeDark } = featureColors[feature]
    return {
      accent,
      badgeBg: theme.isDark ? badgeDark : badgeLight,
    }
  }

  const getWifiSubtitle = (): string => {
    if (!wifiStatus.connected) return t("controlMenu:subtitles.wifiDisconnected")
    return t("controlMenu:subtitles.wifiConnected")
  }

  const getBtSubtitle = (): string => {
    if (!btStatus.powered) return t("controlMenu:subtitles.bluetoothOff")
    if (btStatus.connectedCount > 0) {
      return t("controlMenu:subtitles.bluetoothConnected", { count: btStatus.connectedCount })
    }
    return t("controlMenu:subtitles.bluetoothOn")
  }

  const getAudioSubtitle = (): string => {
    if (audioStatus.muted) return t("controlMenu:subtitles.audioMuted")
    return t("controlMenu:subtitles.audioVolume", { volume: audioStatus.volume })
  }

  const getStorageSubtitle = (): string => {
    return t("controlMenu:subtitles.storageWear", { percent: storageStatus.healthPercent })
  }

  const handleReboot = () => {
    Alert.alert(
      t("reboot:title"),
      t("reboot:message"),
      [
        { text: t("common:cancel"), style: "cancel" },
        { 
          text: t("reboot:confirm"), 
          style: "destructive", 
          onPress: async () => {
            try {
              const response = await fetch('http://192.168.50.134:3001/api/system/reboot', {
                method: 'POST',
              })
              if (response.ok) {
                Alert.alert(t("common:success"), t("reboot:rebooting"))
              } else {
                Alert.alert(t("common:error"), t("reboot:failed"))
              }
            } catch (error) {
              Alert.alert(t("common:error"), t("reboot:failed"))
            }
          } 
        },
      ]
    )
  }

  const MENU_ITEMS: MenuItem[] = [
    { 
      id: "wifi", 
      titleTx: "controlMenu:wifi", 
      subtitleTx: getWifiSubtitle(),
      icon: { font: "Ionicons", name: "wifi", color: getWifiColors.accent, badgeBg: getWifiColors.badgeBg }, 
      accentColor: getWifiColors.accent, 
      screen: "Wifi" 
    },
    { 
      id: "bluetooth", 
      titleTx: "controlMenu:bluetooth", 
      subtitleTx: getBtSubtitle(),
      icon: { font: "Ionicons", name: "bluetooth", color: btColors.accent, badgeBg: btColors.badgeBg }, 
      accentColor: btColors.accent, 
      screen: "Bluetooth" 
    },
    { 
      id: "audio", 
      titleTx: "controlMenu:audio", 
      subtitleTx: getAudioSubtitle(),
      icon: { font: "Ionicons", name: "volume-high", color: audioColors.accent, badgeBg: audioColors.badgeBg }, 
      accentColor: audioColors.accent, 
      screen: "Audio" 
    },
    { 
      id: "camera", 
      titleTx: "controlMenu:camera", 
      subtitleTx: t("controlMenu:subtitles.cameraOffline"),
      icon: { font: "Ionicons", name: "camera", color: cameraColors.accent, badgeBg: cameraColors.badgeBg }, 
      accentColor: cameraColors.accent, 
      screen: "Camera" 
    },
    { 
      id: "storage", 
      titleTx: "controlMenu:storage", 
      subtitleTx: getStorageSubtitle(),
      icon: { font: "MaterialCommunityIcons", name: "harddisk", color: storageColors.accent, badgeBg: storageColors.badgeBg }, 
      accentColor: storageColors.accent, 
      screen: "Storage" 
    },
    { 
      id: "reboot", 
      titleTx: "controlMenu:reboot", 
      subtitleTx: t("common:ok"),
      icon: { font: "Ionicons", name: "refresh", color: theme.colors.error, badgeBg: theme.isDark ? "#7F1D1D" : "#FEF2F2" }, 
      accentColor: theme.colors.error, 
      danger: true, 
      action: handleReboot
    },
    { 
      id: "cronjob", 
      titleTx: "controlMenu:cronjob", 
      subtitleTx: "controlMenu:subtitles.cronjob",
      icon: { font: "Ionicons", name: "time", color: "#8B5CF6", badgeBg: "#F5F3FF" }, 
      accentColor: "#8B5CF6", 
      screen: "CronJob" 
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
