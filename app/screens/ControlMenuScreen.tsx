import { FC, useState, useEffect } from "react"
import { View, ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { useNavigation } from "@react-navigation/native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { FeatureCard } from "@/components/FeatureCard"
import { useAppTheme } from "@/theme/context"
import { featureColors } from "@/theme/featureColors"
import { AlertModal, type AlertButton } from "@/components/AlertModal"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"
import type { TxKeyPath } from "@/i18n"
import { useSocket } from "@/services/socket/SocketContext"
import { wifiClientModule } from "@/services/socket/modules/wifi"
import { bluetoothClientModule } from "@/services/socket/modules/bluetooth"
import { audioClientModule } from "@/services/socket/modules/audio"
import { storageClientModule } from "@/services/socket/modules/storage"
import { systemClientModule } from "@/services/socket/modules/system"

type ControlMenuScreenProps = MainTabScreenProps<"Control">

interface MenuItem {
  id: string
  titleTx: TxKeyPath
  subtitle?: string // For dynamic strings
  subtitleTx?: TxKeyPath // For translation keys
  subtitleParams?: Record<string, string | number>
  icon: {
    font: "Ionicons" | "MaterialCommunityIcons"
    name: string
    color: string
    badgeBg: string
  }
  accentColor: string
  danger?: boolean
  screen?:
    | "Wifi"
    | "Bluetooth"
    | "Audio"
    | "Camera"
    | "Storage"
    | "CronJob"
    | "SystemControl"
    | "FileManager"
    | "ModelUsage"
    | "ClaudeModel"
  action?: () => void
}

export const ControlMenuScreen: FC<ControlMenuScreenProps> = function ControlMenuScreen({
  navigation,
}) {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()

  // Alert modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: "", buttons: [] })

  // Real-time status states
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; ssid?: string }>({
    connected: false,
  })
  const [btStatus, setBtStatus] = useState<{ powered: boolean; connectedCount: number }>({
    powered: false,
    connectedCount: 0,
  })
  const [audioStatus, setAudioStatus] = useState<{ volume: number; muted: boolean }>({
    volume: 75,
    muted: false,
  })
  const [storageStatus, setStorageStatus] = useState<{ healthPercent: number }>({
    healthPercent: 0,
  })

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
      const connectedCount = status.devices?.filter((d) => d.connected).length || 0
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
  const modelUsageColors = getMenuIcon("modelUsage")
  const claudeModelColors = getMenuIcon("claudeModel")

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

  const showAlert = (
    title: string,
    message?: string,
    buttons: AlertButton[] = [{ text: "OK" }],
  ) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }

  const handleReboot = () => {
    showAlert(t("reboot:title"), t("reboot:message"), [
      { text: t("common:cancel"), style: "cancel" },
      {
        text: t("reboot:confirm"),
        style: "destructive",
        onPress: () => {
          systemClientModule.requestReboot()
          showAlert(t("common:success"), t("reboot:rebooting"))
        },
      },
    ])
  }

  const MENU_ITEMS: MenuItem[] = [
    {
      id: "wifi",
      titleTx: "controlMenu:wifi",
      subtitle: getWifiSubtitle(),
      icon: {
        font: "Ionicons",
        name: "wifi",
        color: getWifiColors.accent,
        badgeBg: getWifiColors.badgeBg,
      },
      accentColor: getWifiColors.accent,
      screen: "Wifi",
    },
    {
      id: "bluetooth",
      titleTx: "controlMenu:bluetooth",
      subtitle: getBtSubtitle(),
      icon: {
        font: "Ionicons",
        name: "bluetooth",
        color: btColors.accent,
        badgeBg: btColors.badgeBg,
      },
      accentColor: btColors.accent,
      screen: "Bluetooth",
    },
    {
      id: "audio",
      titleTx: "controlMenu:audio",
      subtitle: getAudioSubtitle(),
      icon: {
        font: "Ionicons",
        name: "volume-high",
        color: audioColors.accent,
        badgeBg: audioColors.badgeBg,
      },
      accentColor: audioColors.accent,
      screen: "Audio",
    },
    {
      id: "camera",
      titleTx: "controlMenu:camera",
      subtitle: t("controlMenu:subtitles.cameraOffline"),
      icon: {
        font: "Ionicons",
        name: "camera",
        color: cameraColors.accent,
        badgeBg: cameraColors.badgeBg,
      },
      accentColor: cameraColors.accent,
      screen: "Camera",
    },
    {
      id: "storage",
      titleTx: "controlMenu:storage",
      subtitle: getStorageSubtitle(),
      icon: {
        font: "MaterialCommunityIcons",
        name: "harddisk",
        color: storageColors.accent,
        badgeBg: storageColors.badgeBg,
      },
      accentColor: storageColors.accent,
      screen: "Storage",
    },
    {
      id: "reboot",
      titleTx: "controlMenu:reboot",
      subtitle: t("common:ok"),
      icon: {
        font: "Ionicons",
        name: "refresh",
        color: theme.colors.error,
        badgeBg: theme.isDark ? "#7F1D1D" : "#FEF2F2",
      },
      accentColor: theme.colors.error,
      danger: true,
      action: handleReboot,
    },
    {
      id: "cronjob",
      titleTx: "controlMenu:cronjob",
      subtitleTx: "controlMenu:subtitles.cronjob",
      icon: { font: "Ionicons", name: "time", color: "#8B5CF6", badgeBg: "#F5F3FF" },
      accentColor: "#8B5CF6",
      screen: "CronJob",
    },
    {
      id: "model-usage",
      titleTx: "controlMenu:modelUsage",
      subtitleTx: "controlMenu:subtitles.modelUsage",
      icon: {
        font: "Ionicons",
        name: "sparkles",
        color: modelUsageColors.accent,
        badgeBg: modelUsageColors.badgeBg,
      },
      accentColor: modelUsageColors.accent,
      screen: "ModelUsage",
    },
    {
      id: "system",
      titleTx: "controlMenu:system",
      subtitle: t("controlMenu:subtitles.system"),
      icon: { font: "Ionicons", name: "settings-outline", color: "#10B981", badgeBg: "#ECFDF5" },
      accentColor: "#10B981",
      screen: "SystemControl",
    },
    {
      id: "files",
      titleTx: "controlMenu:files",
      subtitle: t("controlMenu:subtitles.files"),
      icon: { font: "Ionicons", name: "folder-open", color: "#F59E0B", badgeBg: "#FFFBEB" },
      accentColor: "#F59E0B",
      screen: "FileManager",
    },
    {
      id: "claude-model",
      titleTx: "controlMenu:claudeModel",
      subtitleTx: "controlMenu:subtitles.claudeModel",
      icon: {
        font: "Ionicons",
        name: "hardware-chip-outline",
        color: claudeModelColors.accent,
        badgeBg: claudeModelColors.badgeBg,
      },
      accentColor: claudeModelColors.accent,
      screen: "ClaudeModel",
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
              subtitle={item.subtitle}
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

      {/* Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </Screen>
  )
}

const $gridContainer: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  paddingHorizontal: 16,
}
const $cardWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "48%",
  marginBottom: spacing.md,
})
