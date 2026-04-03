import { FC, useState, useMemo, useCallback } from "react"
import { View, ViewStyle, RefreshControl, TextStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { ConnectionBadge } from "@/components/ConnectionBadge"
import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { StatCard } from "@/components/StatCard"
import { Text } from "@/components/Text"
import type { TxKeyPath } from "@/i18n"
import { useSystemStats } from "@/hooks/useSystemStats"
import { useWiFiStats } from "@/hooks/useWiFiStats"
import type { SystemStats } from "../../shared/types/system"
import { useConnectionState } from "@/services/socket/SocketContext"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(1)}GB`
}

function getSignalIcon(signal: number | null): string {
  if (!signal) return "wifi-outline"
  if (signal >= 70) return "wifi"
  if (signal >= 40) return "wifi-outline"
  return "wifi-outline"
}

function getWifiSignalTx(signal: number | null): TxKeyPath | null {
  if (!signal) return null
  if (signal >= 80) return "dashboard:wifiSignalExcellent"
  if (signal >= 60) return "dashboard:wifiSignalGood"
  if (signal >= 40) return "dashboard:wifiSignalFair"
  return "dashboard:wifiSignalWeak"
}

type NetworkIfaceRow = SystemStats["network"][number]

export const DashboardScreen: FC = function DashboardScreen() {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const [refreshing, setRefreshing] = useState(false)
  const { stats, info, isConnected, error, retry } = useSystemStats()
  const { currentSSID, signalStrength } = useWiFiStats()
  const connectionState = useConnectionState()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    retry()
    setTimeout(() => setRefreshing(false), 1000)
  }, [retry])

  const displayStats = useMemo(() => {
    const s: SystemStats | null = stats
    if (!s) {
      return {
        cpu: { value: 0, caption: "--" },
        temperature: { value: 0, caption: "--" },
        memory: { value: 0, caption: "-- / --" },
        disk: { value: 0, caption: "-- / --" },
      }
    }

    const mainDisk = s.disk.find((d) => d.mount === "/") || s.disk[0]
    const memoryUsedGB = (s.memory.used / (1024 * 1024 * 1024)).toFixed(1)
    const memoryTotalGB = (s.memory.total / (1024 * 1024 * 1024)).toFixed(1)

    return {
      cpu: { value: s.cpu.usage, caption: `${s.cpu.cores} cores` },
      temperature: { value: s.cpu.temperature, caption: s.cpu.model.slice(0, 20) },
      memory: {
        value: Math.round((s.memory.used / s.memory.total) * 100),
        caption: `${memoryUsedGB}GB / ${memoryTotalGB}GB`,
      },
      disk: {
        value: mainDisk?.percent ?? 0,
        caption: mainDisk ? `${formatBytes(mainDisk.used)} / ${formatBytes(mainDisk.size)}` : "--",
      },
    }
  }, [stats])

  const deviceInfo = useMemo(() => {
    if (!info) return []
    return [
      { key: "dashboard:hostname" as TxKeyPath, value: info.hostname },
      { key: "dashboard:os" as TxKeyPath, value: info.os.distro },
      { key: "dashboard:kernel" as TxKeyPath, value: info.os.kernel },
      { key: "dashboard:uptime" as TxKeyPath, value: formatUptime(stats?.uptime ?? 0) },
    ]
  }, [info?.hostname, info?.os.distro, info?.os.kernel, stats?.uptime])

  const networkInterfaces = useMemo(() => {
    const s: SystemStats | null = stats
    if (!s?.network) return []
    return s.network
      .filter((net: NetworkIfaceRow) => net.iface !== "lo")
      .map((net: NetworkIfaceRow) => ({
        name: net.iface,
        displayName: net.iface === "wlan0" ? t("dashboard:interfaceWifi") : net.iface,
        ip: net.ip4 || null,
        status: net.isUp ? ("up" as const) : ("down" as const),
        isWifi: net.iface === "wlan0",
      }))
  }, [stats, t])

  const connectionStatus = useMemo(() => {
    return connectionState.status === "connected" && connectionState.isAuthenticated
      ? ("connected" as const)
      : connectionState.status === "connecting"
        ? ("connecting" as const)
        : ("disconnected" as const)
  }, [connectionState.status, connectionState.isAuthenticated])

  const signalLabelTx = getWifiSignalTx(signalStrength)
  const wifiSignalLine =
    !!signalStrength && !!signalLabelTx ? `${signalStrength}% • ${t(signalLabelTx)}` : null

  return (
    <Screen
      preset="scroll"
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
      }}
    >
      <Header titleTx="dashboard:title" titleMode="center" />

      <View style={themed($statusRow)}>
        <ConnectionBadge status={connectionStatus} />
        {!!info?.hostname ? (
          <Text text={info.hostname} size="sm" color="textDim" />
        ) : (
          <Text tx="dashboard:connectingHost" size="sm" color="textDim" />
        )}
      </View>

      {!!error && (
        <View style={themed($errorCard)}>
          <Icon font="Ionicons" icon="alert-circle" color={theme.colors.error} size={24} />
          <Text text={error.message} color="error" size="sm" style={$errorText} />
          <Text
            tx="dashboard:tapToRetry"
            color="textDim"
            size="xs"
            onPress={onRefresh}
            style={themed($retryLink)}
          />
        </View>
      )}

      <View style={themed($statsGrid)}>
        <StatCard
          labelTx="dashboard:stats.cpu"
          value={`${displayStats.cpu.value}%`}
          progress={displayStats.cpu.value}
          progressColor={theme.colors.tint}
          caption={displayStats.cpu.caption}
          icon={{ font: "Ionicons", name: "hardware-chip", color: "#6366F1", badgeBg: "#EEF2FF" }}
        />
        <StatCard
          labelTx="dashboard:stats.temperature"
          value={`${displayStats.temperature.value}`}
          unit="°C"
          progress={displayStats.temperature.value}
          progressColor={displayStats.temperature.value > 60 ? "#F59E0B" : "#10B981"}
          caption={displayStats.temperature.caption}
          icon={{ font: "Ionicons", name: "thermometer", color: "#F59E0B", badgeBg: "#FFFBEB" }}
        />
      </View>

      <View style={themed($statsGrid)}>
        <StatCard
          labelTx="dashboard:stats.memory"
          value={`${displayStats.memory.value}%`}
          progress={displayStats.memory.value}
          progressColor="#8B5CF6"
          caption={displayStats.memory.caption}
          icon={{ font: "Ionicons", name: "cube", color: "#8B5CF6", badgeBg: "#F5F3FF" }}
        />
        <StatCard
          labelTx="dashboard:stats.disk"
          value={`${displayStats.disk.value}%`}
          progress={displayStats.disk.value}
          progressColor="#06B6D4"
          caption={displayStats.disk.caption}
          icon={{
            font: "MaterialCommunityIcons",
            name: "harddisk",
            color: "#06B6D4",
            badgeBg: "#ECFEFF",
          }}
        />
      </View>

      <SectionHeader titleTx="dashboard:network" style={themed($section)} />
      <View style={themed($card)}>
        {networkInterfaces.length === 0 ? (
          <Text
            tx="dashboard:noNetworkInterfaces"
            color="textDim"
            size="sm"
            style={themed($networkEmpty)}
          />
        ) : (
          networkInterfaces.map((net, index) => (
            <View key={net.name} style={themed([$networkRow, index > 0 && $networkDivider])}>
              <View
                style={themed([
                  $networkIconBadge,
                  net.status === "up" ? $networkIconBadgeUp : $networkIconBadgeDown,
                ])}
              >
                <Icon
                  font="Ionicons"
                  icon={net.isWifi ? getSignalIcon(signalStrength) : "ethernet"}
                  color={net.status === "up" ? theme.colors.palette.info500 : theme.colors.textDim}
                  size={18}
                />
              </View>
              <View style={$networkInfo}>
                <Text text={net.displayName} weight="medium" color="text" />
                {!!net.ip ? (
                  <Text text={net.ip} size="xs" color="textDim" />
                ) : (
                  <Text tx="dashboard:notConnected" size="xs" color="error" />
                )}
                {!!(net.isWifi && currentSSID) && (
                  <Text text={currentSSID} size="xs" color="textDim" style={themed($wifiSsid)} />
                )}
                {!!(net.isWifi && wifiSignalLine) && (
                  <Text text={wifiSignalLine} size="xs" color="textDim" />
                )}
              </View>
              <View
                style={[
                  themed($statusDot),
                  themed(net.status === "up" ? $statusDotUp : $statusDotDown),
                ]}
              />
            </View>
          ))
        )}
      </View>

      <SectionHeader titleTx="dashboard:deviceInfo" style={themed($section)} />
      <View style={themed($card)}>
        {deviceInfo.map(({ key, value }, index) => (
          <View key={key} style={themed([$deviceRow, index > 0 && $deviceDivider])}>
            <Text tx={key} color="textDim" size="sm" />
            <Text text={value} weight="medium" size="sm" color="text" />
          </View>
        ))}
      </View>
    </Screen>
  )
}

const $statusRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $statsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  marginBottom: spacing.md,
  paddingHorizontal: spacing.md,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  marginBottom: spacing.xs,
  paddingHorizontal: spacing.md,
})

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  marginHorizontal: spacing.md,
  marginBottom: spacing.md,
})

const $networkRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
})

const $networkDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.border,
})

const $networkIconBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.sm,
})

const $networkIconBadgeUp: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.info100,
})

const $networkIconBadgeDown: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
})

const $networkInfo: ViewStyle = {
  flex: 1,
}

const $statusDot: ThemedStyle<ViewStyle> = () => ({
  width: 8,
  height: 8,
  borderRadius: 4,
})

const $statusDotUp: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.success,
})

const $statusDotDown: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
})

const $deviceRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: spacing.xs,
})

const $deviceDivider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopWidth: 1,
  borderTopColor: colors.border,
  marginTop: spacing.xs,
  paddingTop: spacing.xs,
})

const $errorCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error + "15",
  borderRadius: spacing.md,
  padding: spacing.md,
  marginHorizontal: spacing.md,
  marginBottom: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $errorText: ViewStyle = {
  flex: 1,
}

const $retryLink: ThemedStyle<TextStyle> = () => ({
  textDecorationLine: "underline",
})

const $networkEmpty: ThemedStyle<TextStyle> = ({ spacing }) => ({
  textAlign: "center",
  paddingVertical: spacing.sm,
})

const $wifiSsid: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xxs,
})
