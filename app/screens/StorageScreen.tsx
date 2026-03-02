import { FC, useState } from "react"
import { View, ViewStyle, Pressable, TextStyle } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { StatCard } from "@/components/StatCard"
import { ProgressBar } from "@/components/ProgressBar"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type StorageScreenProps = AppStackScreenProps<"Storage">

type HealthStatus = "healthy" | "warning" | "critical"

const MOCK_STORAGE = {
  model: "Samsung 970 EVO Plus 250GB",
  type: "NVMe SSD",
  device: "/dev/nvme0n1",
  serial: "S4EWNX0M123456",
  firmware: "2B2QEXM7",
  interface: "NVMe",
  capacity: "232.9 GB",
  usedSpace: "89.2 / 232.9 GB",
  percentageUsed: 38,
  temperature: 38,
  lifespanUsed: 12,
  totalWritten: "2.4 TB",
  powerOnHours: 1247,
}

const PARTITIONS = [
  { mountPoint: "/", filesystem: "ext4", used: "42.1 GB", total: "116.5 GB", percentage: 36 },
  { mountPoint: "/boot", filesystem: "vfat", used: "256 MB", total: "512 MB", percentage: 50 },
]

const S_MART_DATA = [
  { name: "Available Spare", value: "100%", status: "ok" },
  { name: "Media Errors", value: "0", status: "ok" },
  { name: "Unsafe Shutdowns", value: "3", status: "warning" },
]

const getHealthStatus = (p: number): HealthStatus => p < 80 ? "healthy" : p < 95 ? "warning" : "critical"
const getHealthColor = (s: HealthStatus) => s === "healthy" ? { bg: "#D1FAE5", text: "#059669", icon: "✓" } : s === "warning" ? { bg: "#FEF3C7", text: "#D97706", icon: "⚠️" } : { bg: "#FEE2E2", text: "#DC2626", icon: "❌" }
const formatNumber = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

export const StorageScreen: FC<StorageScreenProps> = function StorageScreen({ navigation }) {
  const { themed } = useAppTheme()
  const [showSmart, setShowSmart] = useState(false)
  const healthStatus = getHealthStatus(MOCK_STORAGE.percentageUsed)
  const healthColor = getHealthColor(healthStatus)

  return (
    <Screen preset="scroll">
      <Header title="Storage Health" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <Card 
        heading={healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Warning" : "Critical"}
        ContentComponent={
          <>
            <View style={$healthBadge}>
              <View style={[$healthBadgeInner, { backgroundColor: healthColor.bg }]}>
                <Text text={healthColor.icon} size="lg" />
              </View>
            </View>
            <Text text={MOCK_STORAGE.model} size="lg" weight="semiBold" color="text" />
            <Text text={MOCK_STORAGE.type} size="sm" color="textDim" />
          </>
        }
        style={$card}
      />

      <SectionHeader title="Key Metrics" style={$sectionHeader} />
      <View style={$metricsGrid}>
        <StatCard label="Lifespan Used" value={`${MOCK_STORAGE.lifespanUsed}%`} progress={MOCK_STORAGE.lifespanUsed} progressColor="#06B6D4" caption="Estimated lifespan" icon={{ font: "MaterialCommunityIcons", name: "heart-pulse", color: "#06B6D4", badgeBg: "#ECFEFF" }} />
        <StatCard label="Temperature" value={`${MOCK_STORAGE.temperature}°C`} progress={MOCK_STORAGE.temperature} progressColor="#10B981" caption="Drive thermal" icon={{ font: "MaterialCommunityIcons", name: "thermometer", color: "#F59E0B", badgeBg: "#FFFBEB" }} />
        <StatCard label="Total Written" value={MOCK_STORAGE.totalWritten} caption="Lifetime writes" icon={{ font: "MaterialCommunityIcons", name: "arrow-down-circle", color: "#8B5CF6", badgeBg: "#F5F3FF" }} />
        <StatCard label="Power On" value={formatNumber(MOCK_STORAGE.powerOnHours)} unit="hrs" caption="Total runtime" icon={{ font: "MaterialCommunityIcons", name: "clock", color: "#3B82F6", badgeBg: "#EFF6FF" }} />
      </View>

      <Card 
        heading="Drive Details"
        ContentComponent={
          <>
            <View style={$detailRow}><Text text="Device" size="sm" color="textDim" style={$detailKey} /><Text text={MOCK_STORAGE.device} size="sm" color="text" /></View>
            <View style={$detailRow}><Text text="Serial" size="sm" color="textDim" style={$detailKey} /><Text text={MOCK_STORAGE.serial.slice(0,8)+"..."} size="sm" color="text" /></View>
            <View style={$detailRow}><Text text="Firmware" size="sm" color="textDim" style={$detailKey} /><Text text={MOCK_STORAGE.firmware} size="sm" color="text" /></View>
            <View style={$detailRow}><Text text="Capacity" size="sm" color="textDim" style={$detailKey} /><Text text={MOCK_STORAGE.capacity} size="sm" color="text" /></View>
          </>
        }
        style={$card}
      />

      <Card 
        heading={showSmart ? "S.M.A.R.T. Data ▼" : "S.M.A.R.T. Data ▶"}
        ContentComponent={
          <Pressable onPress={() => setShowSmart(!showSmart)}>
            {showSmart && S_MART_DATA.map((item) => (
              <View key={item.name} style={[$smartRow, item.status === "warning" && $smartRowWarning]}>
                <Text text={item.name} size="sm" color="text" />
                <Text text={item.value} size="sm" color="text" style={$smartValue} />
              </View>
            ))}
          </Pressable>
        }
        style={$card}
      />

      <Card 
        heading="Partitions"
        ContentComponent={
          PARTITIONS.map((p) => (
            <View key={p.mountPoint} style={$partitionRow}>
              <Text text="📁" size="lg" style={$partitionIcon} />
              <View style={$partitionCenter}>
                <Text text={p.mountPoint} size="sm" weight="medium" color="text" />
                <Text text={p.filesystem} size="xs" color="textDim" />
              </View>
              <View style={$partitionRight}>
                <ProgressBar value={p.percentage} style={$partitionProgress} />
                <Text text={`${p.used} / ${p.total}`} size="xs" color="textDim" />
              </View>
            </View>
          ))
        }
        style={$card}
      />
    </Screen>
  )
}

const $card: ViewStyle = { marginHorizontal: 16, marginBottom: 16 }
const $sectionHeader: ViewStyle = { marginHorizontal: 16, marginTop: 8, marginBottom: 8 }

const $healthBadge: ViewStyle = { alignItems: "center", marginBottom: 12 }
const $healthBadgeInner: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }

const $metricsGrid: ViewStyle = { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 }

const $detailRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }
const $detailKey: TextStyle = { width: 80 }

const $smartRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderLeftWidth: 4, borderLeftColor: "transparent", paddingLeft: 8 }
const $smartRowWarning: ViewStyle = { borderLeftColor: "#F59E0B" }
const $smartValue: TextStyle = { fontFamily: "monospace" }

const $partitionRow: ViewStyle = { flexDirection: "row", alignItems: "center", paddingVertical: 12 }
const $partitionIcon: ViewStyle = { width: 36, marginRight: 12 }
const $partitionCenter: ViewStyle = { flex: 1 }
const $partitionRight: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $partitionProgress: ViewStyle = { width: 80, height: 4 }
