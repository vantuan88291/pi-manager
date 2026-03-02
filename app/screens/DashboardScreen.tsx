import { FC, useState } from "react"
import { ScrollView, View, ViewStyle, RefreshControl } from "react-native"

import { ConnectionBadge } from "@/components/ConnectionBadge"
import { Icon } from "@/components/Icon"
import { SectionHeader } from "@/components/SectionHeader"
import { StatCard } from "@/components/StatCard"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const mockStats = {
  cpu: { value: 45, label: "CPU", caption: "Cortex-A72" },
  temperature: { value: 52, label: "Temperature", caption: "System Thermal" },
  memory: { value: 68, label: "Memory", caption: "4GB / 8GB" },
  disk: { value: 34, label: "Disk", caption: "120GB / 500GB" },
}

const mockNetwork = [
  { name: "wlan0", ip: "192.168.1.100", status: "up" },
  { name: "eth0", ip: null, status: "down" },
]

const mockDeviceInfo = {
  hostname: "raspberrypi",
  os: "Raspberry Pi OS",
  kernel: "6.1.21-v8+",
  uptime: "3d 14h 22m",
}

export const DashboardScreen: FC = function DashboardScreen() {
  const { themed, theme } = useAppTheme()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <View style={themed($container)}>
      <View style={themed($header)}>
        <ConnectionBadge status="connected" />
        <Text text="Pi Manager" size="md" weight="semiBold" style={themed($headerTitle)} />
        <Icon font="Ionicons" icon="settings-outline" color={theme.colors.textDim} size={24} />
      </View>

      <ScrollView
        style={$scrollView}
        contentContainerStyle={themed($scrollContent)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={themed($statsGrid)}>
          <StatCard label={mockStats.cpu.label} value={`${mockStats.cpu.value}%`} progress={mockStats.cpu.value} progressColor={theme.colors.tint} caption={mockStats.cpu.caption} icon={{ font: "Ionicons", name: "hardware-chip", color: "#6366F1", badgeBg: "#EEF2FF" }} />
          <StatCard label={mockStats.temperature.label} value={`${mockStats.temperature.value}`} unit="°C" progress={mockStats.temperature.value} progressColor={mockStats.temperature.value > 60 ? "#F59E0B" : "#10B981"} caption={mockStats.temperature.caption} icon={{ font: "Ionicons", name: "thermometer", color: "#F59E0B", badgeBg: "#FFFBEB" }} />
        </View>

        <View style={themed($statsGrid)}>
          <StatCard label={mockStats.memory.label} value={`${mockStats.memory.value}%`} progress={mockStats.memory.value} progressColor="#8B5CF6" caption={mockStats.memory.caption} icon={{ font: "Ionicons", name: "cube", color: "#8B5CF6", badgeBg: "#F5F3FF" }} />
          <StatCard label={mockStats.disk.label} value={`${mockStats.disk.value}%`} progress={mockStats.disk.value} progressColor="#06B6D4" caption={mockStats.disk.caption} icon={{ font: "MaterialCommunityIcons", name: "harddisk", color: "#06B6D4", badgeBg: "#ECFEFF" }} />
        </View>

        <SectionHeader title="Network" style={themed($section)} />
        <View style={themed($card)}>
          {mockNetwork.map((net, index) => (
            <View key={net.name} style={themed([$networkRow, index > 0 && $networkDivider])}>
              <View style={[$networkIconBadge, { backgroundColor: net.status === "up" ? "#EFF6FF" : "#F1F5F9" }]}>
                <Icon font="Ionicons" icon={net.status === "up" ? "wifi" : "wifi-outline"} color={net.status === "up" ? "#3B82F6" : theme.colors.textDim} size={18} />
              </View>
              <View style={$networkInfo}>
                <Text text={net.name} weight="medium" />
                <Text text={net.ip ?? "Not connected"} size="xs" color={net.ip ? "textDim" : "error"} />
              </View>
              <View style={[$statusDot, { backgroundColor: net.status === "up" ? "#10B981" : "#EF4444" }]} />
            </View>
          ))}
        </View>

        <SectionHeader title="Device Info" style={themed($section)} />
        <View style={themed($card)}>
          {Object.entries(mockDeviceInfo).map(([key, value], index) => (
            <View key={key} style={themed([$deviceRow, index > 0 && $deviceDivider])}>
              <Text text={key.charAt(0).toUpperCase() + key.slice(1)} color="textDim" size="sm" />
              <Text text={value} weight="medium" size="sm" />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({ flex: 1, backgroundColor: colors.background })
const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border })
const $headerTitle = { color: "#1E293B" as any }
const $scrollView: ViewStyle = { flex: 1 }
const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $statsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md })
const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.lg, marginBottom: spacing.xs })
const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md })
const $networkRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs })
const $networkDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border })
const $networkIconBadge: ViewStyle = { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $networkInfo: ViewStyle = { flex: 1 }
const $statusDot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
const $deviceRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs })
const $deviceDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border })
