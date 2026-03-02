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
import { getFeatureColor } from "@/theme/featureColors"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type StorageScreenProps = AppStackScreenProps<"Storage">

const MOCK_STORAGE = {
  model: "Samsung 970 EVO Plus 250GB",
  type: "NVMe SSD",
  device: "/dev/nvme0n1",
  serial: "S4EWNX0M123456",
  firmware: "2B2QEXM7",
  capacity: "232.9 GB",
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
  { name: "Critical Warning", value: "0", status: "ok" },
]

const getHealthStatus = (p: number) => p < 80 ? "healthy" : p < 95 ? "warning" : "critical"
const alpha = (color: string, opacity: number) => color + Math.round(opacity * 255).toString(16).padStart(2, "0").toUpperCase()
const getHealthColor = (s: string, theme: any) => s === "healthy" ? { bg: alpha(theme.colors.success, 0.12), text: theme.colors.success } : s === "warning" ? { bg: alpha(theme.colors.warning, 0.12), text: theme.colors.warning } : { bg: alpha(theme.colors.error, 0.12), text: theme.colors.error }
const formatNumber = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

export const StorageScreen: FC<StorageScreenProps> = function StorageScreen({ navigation }) {
  const { theme } = useAppTheme()
  const { accent: storageAccent } = getFeatureColor("storage", theme.isDark)
  const [showSmart, setShowSmart] = useState(false)
  const healthStatus = getHealthStatus(MOCK_STORAGE.percentageUsed)
  const healthColor = getHealthColor(healthStatus, theme)

  return (
    <Screen preset="scroll">
      <Header title="Storage Health" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <View style={$container}>
        {/* Health Overview */}
        <Card 
          heading={healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Warning" : "Critical"}
          ContentComponent={
            <>
              <View style={$healthBadgeRow}>
                <View style={[$healthBadge, { backgroundColor: healthColor.bg }]}>
                  <Text text={healthStatus === "healthy" ? "✓" : "⚠️"} size="lg" color={healthColor.text} />
                  <Text text={healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Warning" : "Critical"} size="md" weight="bold" color={healthColor.text} />
                </View>
              </View>
              <Text text={MOCK_STORAGE.model} size="lg" weight="semiBold" color="text" style={$modelText} />
              <Text text={MOCK_STORAGE.type} size="sm" color="textDim" />
            </>
          }
          style={$card}
        />

        {/* Key Metrics - 2x2 Grid */}
        <SectionHeader title="Key Metrics" style={$sectionHeader} />
        <View style={$metricsGrid}>
          <View style={$metricCard}><StatCard label="Lifespan" value={`${MOCK_STORAGE.lifespanUsed}%`} progress={MOCK_STORAGE.lifespanUsed} progressColor={storageAccent} caption="Lifetime left" icon={{ font: "MaterialCommunityIcons", name: "heart-pulse", color: storageAccent, badgeBg: theme.isDark ? "#164E63" : "#ECFEFF" }} /></View>
          <View style={$metricCard}><StatCard label="Temp" value={`${MOCK_STORAGE.temperature}°C`} progress={MOCK_STORAGE.temperature} progressColor={theme.colors.success} caption="Drive thermal" icon={{ font: "MaterialCommunityIcons", name: "thermometer", color: theme.colors.warning, badgeBg: theme.isDark ? "#78350F" : "#FFFBEB" }} /></View>
          <View style={$metricCard}><StatCard label="Written" value={MOCK_STORAGE.totalWritten} caption="Lifetime total" icon={{ font: "MaterialCommunityIcons", name: "arrow-down-circle", color: "#8B5CF6", badgeBg: theme.isDark ? "#4C1D95" : "#F5F3FF" }} /></View>
          <View style={$metricCard}><StatCard label="Power On" value={formatNumber(MOCK_STORAGE.powerOnHours)} unit="hrs" caption="Total runtime" icon={{ font: "MaterialCommunityIcons", name: "clock", color: "#3B82F6", badgeBg: theme.isDark ? "#1E3A5F" : "#EFF6FF" }} /></View>
        </View>

        {/* Drive Details */}
        <Card heading="Drive Details" ContentComponent={<View style={$detailList}>{[
          ["Device", MOCK_STORAGE.device],
          ["Serial", MOCK_STORAGE.serial.slice(0,8)+"..."],
          ["Firmware", MOCK_STORAGE.firmware],
          ["Capacity", MOCK_STORAGE.capacity],
        ].map(([k,v]) => <View key={k} style={$detailRow}><Text text={k} size="sm" color="textDim" style={$detailKey} /><Text text={v} size="sm" color="text" /></View>)}</View>} style={$card} />

        {/* S.M.A.R.T. Data */}
        <Card 
          heading="S.M.A.R.T. Data"
          ContentComponent={
            <Pressable onPress={() => setShowSmart(!showSmart)}>
              {showSmart && S_MART_DATA.map((item) => (
                <View key={item.name} style={[$smartRow, item.status === "warning" && { borderLeftWidth: 3, borderLeftColor: theme.colors.warning, paddingLeft: 8 }]}>
                  <Text text={item.name} size="sm" color="text" />
                  <Text text={item.value} size="sm" color="text" style={$smartValue} />
                </View>
              ))}
              {!showSmart && <Text text="Tap to expand" size="sm" color="textDim" />}
            </Pressable>
          }
          style={$card}
        />

        {/* Partitions */}
        <Card heading="Partitions" ContentComponent={<View style={$partitionList}>{PARTITIONS.map((p) => (
          <View key={p.mountPoint} style={$partitionRow}>
            <View style={$partitionIcon}><Text text="💾" size="lg" /></View>
            <View style={$partitionCenter}>
              <Text text={p.mountPoint} size="sm" weight="medium" color="text" />
              <Text text={p.filesystem} size="xs" color="textDim" />
            </View>
            <View style={$partitionRight}>
              <ProgressBar value={p.percentage} style={$partitionProgress} />
              <Text text={`${p.used}/${p.total}`} size="xs" color="textDim" />
            </View>
          </View>
        ))}</View>} style={$card} />
      </View>
    </Screen>
  )
}

const $container: ViewStyle = { paddingHorizontal: 16 }
const $card: ViewStyle = { marginBottom: 16 }
const $sectionHeader: ViewStyle = { marginTop: 8, marginBottom: 12 }

const $healthBadgeRow: ViewStyle = { alignItems: "center", marginBottom: 12 }
const $healthBadge: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }
const $modelText: TextStyle = { marginBottom: 4 }

const $metricsGrid: ViewStyle = { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }
const $metricCard: ViewStyle = { width: "50%", paddingHorizontal: 6, marginBottom: 12 }

const $detailList: ViewStyle = { gap: 4 }
const $detailRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }
const $detailKey: TextStyle = { width: 80 }

const $smartRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }
const $smartValue: TextStyle = { fontFamily: "monospace" }

const $partitionList: ViewStyle = { gap: 12 }
const $partitionRow: ViewStyle = { flexDirection: "row", alignItems: "center" }
const $partitionIcon: ViewStyle = { width: 40 }
const $partitionCenter: ViewStyle = { flex: 1 }
const $partitionRight: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $partitionProgress: ViewStyle = { width: 80, height: 4 }
