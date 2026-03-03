import { FC, useState, useMemo, useCallback } from "react"
import { View, ViewStyle, RefreshControl } from "react-native"

import { ConnectionBadge } from "@/components/ConnectionBadge"
import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { StatCard } from "@/components/StatCard"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { TxKeyPath } from "@/i18n"
import { useSystemStats } from "@/hooks/useSystemStats"
import { useWiFiStats } from "@/hooks/useWiFiStats"
import { useConnectionState } from "@/services/socket/SocketContext"

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

function getSignalLabel(signal: number | null): string {
  if (!signal) return ""
  if (signal >= 80) return "Excellent"
  if (signal >= 60) return "Good"
  if (signal >= 40) return "Fair"
  return "Weak"
}

export const DashboardScreen: FC = function DashboardScreen() {
  const { themed, theme } = useAppTheme()
  const [refreshing, setRefreshing] = useState(false)
  const { stats, info, isConnected, error, retry } = useSystemStats()
  const { currentSSID, signalStrength, isConnected: isWifiConnected } = useWiFiStats()
  const connectionState = useConnectionState()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    retry()
    setTimeout(() => setRefreshing(false), 1000)
  }, [retry])

  // Derive display values from socket data - memoized to avoid recalculation
  const displayStats = useMemo(() => {
    if (!stats) {
      return {
        cpu: { value: 0, caption: "--" },
        temperature: { value: 0, caption: "--" },
        memory: { value: 0, caption: "-- / --" },
        disk: { value: 0, caption: "-- / --" },
      }
    }

    const mainDisk = stats.disk.find(d => d.mount === "/") || stats.disk[0]
    const memoryUsedGB = (stats.memory.used / (1024 * 1024 * 1024)).toFixed(1)
    const memoryTotalGB = (stats.memory.total / (1024 * 1024 * 1024)).toFixed(1)

    return {
      cpu: { value: stats.cpu.usage, caption: `${stats.cpu.cores} cores` },
      temperature: { value: stats.cpu.temperature, caption: stats.cpu.model.slice(0, 20) },
      memory: { value: Math.round((stats.memory.used / stats.memory.total) * 100), caption: `${memoryUsedGB}GB / ${memoryTotalGB}GB` },
      disk: { value: mainDisk?.percent ?? 0, caption: mainDisk ? `${formatBytes(mainDisk.used)} / ${formatBytes(mainDisk.size)}` : "--" },
    }
  }, [stats?.cpu.usage, stats?.cpu.temperature, stats?.cpu.model, stats?.cpu.cores, stats?.memory.used, stats?.memory.total, stats?.disk])

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
    if (!stats?.network) return []
    return stats.network
      .filter(net => net.iface !== "lo")  // Filter out loopback
      .map(net => ({
        name: net.iface,
        displayName: net.iface === "wlan0" ? "WiFi" : net.iface,
        ip: net.ip4 || null,
        status: net.isUp ? "up" as const : "down" as const,
        isWifi: net.iface === "wlan0",
      }))
  }, [stats?.network])

  // Connection status - memoized
  const connectionStatus = useMemo(() => {
    return connectionState.status === "connected" && connectionState.isAuthenticated
      ? "connected" as const
      : connectionState.status === "connecting"
        ? "connecting" as const
        : "disconnected" as const
  }, [connectionState.status, connectionState.isAuthenticated])

  return (
    <Screen preset="scroll" ScrollViewProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }}>
      <Header titleTx="dashboard:title" titleMode="center" />

      <View style={themed($statusRow)}>
        <ConnectionBadge status={connectionStatus} />
        <Text text={info?.hostname ?? "connecting..."} size="sm" color="textDim" />
      </View>

      {/* Error state */}
      {error && (
        <View style={themed($errorCard)}>
          <Icon font="Ionicons" icon="alert-circle" color={theme.colors.error} size={24} />
          <Text text={error.message} color="error" size="sm" style={$errorText} />
          <Text text="Tap to retry" color="textDim" size="xs" onPress={onRefresh} style={{ textDecorationLine: "underline" }} />
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
          icon={{ font: "MaterialCommunityIcons", name: "harddisk", color: "#06B6D4", badgeBg: "#ECFEFF" }} 
        />
      </View>

      <SectionHeader titleTx="dashboard:network" style={themed($section)} />
      <View style={themed($card)}>
        {networkInterfaces.length === 0 ? (
          <Text text="No network interfaces" color="textDim" size="sm" style={{ textAlign: "center", paddingVertical: 12 }} />
        ) : (
          networkInterfaces.map((net, index) => (
            <View key={net.name} style={themed([$networkRow, index > 0 && $networkDivider])}>
              <View style={[$networkIconBadge, { backgroundColor: net.status === "up" ? "#EFF6FF" : theme.colors.palette.neutral300 }]}>
                <Icon 
                  font="Ionicons" 
                  icon={net.isWifi ? getSignalIcon(signalStrength) : "ethernet"} 
                  color={net.status === "up" ? "#3B82F6" : theme.colors.textDim} 
                  size={18} 
                />
              </View>
              <View style={$networkInfo}>
                <Text text={net.displayName} weight="medium" color="text" />
                <Text text={net.ip ?? "Not connected"} size="xs" color={net.ip ? "textDim" : "error"} />
                {net.isWifi && currentSSID && (
                  <Text text={currentSSID} size="xs" color="textDim" style={{ marginTop: 2 }} />
                )}
                {net.isWifi && signalStrength && (
                  <Text text={`${signalStrength}% • ${getSignalLabel(signalStrength)}`} size="xs" color="textDim" />
                )}
              </View>
              <View style={[$statusDot, { backgroundColor: net.status === "up" ? theme.colors.success : theme.colors.error }]} />
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

const $statusRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm })
const $statsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, paddingHorizontal: spacing.md })
const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.lg, marginBottom: spacing.xs, paddingHorizontal: spacing.md })
const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md })
const $networkRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm })
const $networkDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border })
const $networkIconBadge: ViewStyle = { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $networkInfo: ViewStyle = { flex: 1 }
const $statusDot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
const $deviceRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs })
const $deviceDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 })
const $errorCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.error + "15", borderRadius: spacing.md, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm })
const $errorText: ViewStyle = { flex: 1 }
