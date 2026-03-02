import { FC, useState } from "react"
import { View, ViewStyle, TextStyle as TStyle, Pressable } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { StatCard } from "@/components/StatCard"
import { ProgressBar } from "@/components/ProgressBar"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"

type StorageScreenProps = AppStackScreenProps<"Storage">

type HealthStatus = "healthy" | "warning" | "critical"

interface StorageInfo {
  model: string
  type: string
  device: string
  serial: string
  firmware: string
  interfaceType: string
  capacity: string
  usedSpace: string
  percentageUsed: number
  temperature: number
  lifespanUsed: number
  totalWritten: string
  powerOnHours: number
}

const MOCK_STORAGE: StorageInfo = {
  model: "Samsung 970 EVO Plus 250GB",
  type: "NVMe SSD",
  device: "/dev/nvme0n1",
  serial: "S4EWNX0M123456",
  firmware: "2B2QEXM7",
  interfaceType: "NVMe",
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
  { mountPoint: "/media/usb0", filesystem: "ntfs", used: "32.8 GB", total: "64.0 GB", percentage: 51 },
]

const S_MART_DATA = [
  { name: "Available Spare", value: "100%", status: "ok" },
  { name: "Available Spare Threshold", value: "10%", status: "ok" },
  { name: "Media Errors", value: "0", status: "ok" },
  { name: "Unsafe Shutdowns", value: "3", status: "warning" },
  { name: "Error Log Entries", value: "0", status: "ok" },
  { name: "Critical Warning", value: "0", status: "ok" },
]

const getHealthStatus = (percentageUsed: number): HealthStatus => {
  if (percentageUsed < 80) return "healthy"
  if (percentageUsed < 95) return "warning"
  return "critical"
}

const getHealthColor = (status: HealthStatus) => {
  switch (status) {
    case "healthy": return { bg: "#ECFDF5", text: "#059669", icon: "✓" }
    case "warning": return { bg: "#FFFBEB", text: "#D97706", icon: "⚠️" }
    case "critical": return { bg: "#FEF2F2", text: "#DC2626", icon: "❌" }
  }
}

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export const StorageScreen: FC<StorageScreenProps> = function StorageScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [storageData] = useState<StorageInfo>(MOCK_STORAGE)
  const [showSmart, setShowSmart] = useState(false)

  const healthStatus = getHealthStatus(storageData.percentageUsed)
  const healthColor = getHealthColor(healthStatus)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  const handleCopySerial = () => {
    console.log("Serial copied:", storageData.serial)
  }

  return (
    <Screen preset="scroll">
      <Header
        title="Storage Health"
        titleMode="center"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        
        onRightPress={handleRefresh}
      />

      {/* Health Overview */}
      <Card style={themed($card)}>
        <View style={themed($healthBadge)}>
          <View style={[themed($healthBadgeInner), { backgroundColor: healthColor.bg }]}>
            <Text text={healthColor.icon} size="lg" />
            <Text text={healthStatus === "healthy" ? "Healthy" : healthStatus === "warning" ? "Warning" : "Critical"} size="md" weight="bold" style={{ color: healthColor.text }} />
          </View>
        </View>
        
        <Text text={storageData.model} size="lg" weight="semiBold"  />
        <Text text={storageData.type} size="sm" color="textDim"  />
      </Card>

      {/* Key Metrics */}
      <SectionHeader title="Key Metrics" style={themed($sectionHeader)} />
      
      <View style={themed($metricsGrid)}>
        <View style={themed($metricCard)}>
          <StatCard
            label="Lifespan Used"
            value={`${storageData.lifespanUsed}%`}
            progress={storageData.lifespanUsed}
            progressColor={storageData.lifespanUsed > 70 ? (storageData.lifespanUsed > 90 ? "#EF4444" : "#F59E0B") : "#06B6D4"}
            caption="Estimated lifespan remaining"
            icon={{ font: "MaterialCommunityIcons", name: "heart-pulse", color: "#06B6D4", badgeBg: "#ECFEFF" }}
          />
        </View>
        
        <View style={themed($metricCard)}>
          <StatCard
            label="Temperature"
            value={`${storageData.temperature}°C`}
            progress={storageData.temperature}
            progressColor={storageData.temperature > 70 ? "#EF4444" : storageData.temperature > 50 ? "#F59E0B" : "#10B981"}
            caption="Drive thermal"
            icon={{ font: "MaterialCommunityIcons", name: "thermometer", color: "#F59E0B", badgeBg: "#FFFBEB" }}
          />
        </View>
        
        <View style={themed($metricCard)}>
          <StatCard
            label="Total Written"
            value={storageData.totalWritten}
            caption="Lifetime writes"
            icon={{ font: "MaterialCommunityIcons", name: "arrow-down-circle", color: "#8B5CF6", badgeBg: "#F5F3FF" }}
          />
        </View>
        
        <View style={themed($metricCard)}>
          <StatCard
            label="Power On"
            value={formatNumber(storageData.powerOnHours)}
            unit="hrs"
            caption="Total runtime"
            icon={{ font: "MaterialCommunityIcons", name: "clock", color: "#3B82F6", badgeBg: "#EFF6FF" }}
          />
        </View>
      </View>

      {/* Drive Details */}
      <Card style={themed($card)}>
        <Text text="Drive Details" size="md" weight="semiBold"  />
        
        <View style={themed($detailRow)}>
          <Text text="Device" size="sm" color="textDim" style={themed($detailKey)} />
          <Text text={storageData.device} size="sm" />
        </View>
        <View style={themed($detailRow)}>
          <Text text="Serial" size="sm" color="textDim" style={themed($detailKey)} />
          <Pressable onPress={handleCopySerial}>
            <Text text={storageData.serial.slice(0, 8) + "..."} size="sm" />
          </Pressable>
        </View>
        <View style={themed($detailRow)}>
          <Text text="Firmware" size="sm" color="textDim" style={themed($detailKey)} />
          <Text text={storageData.firmware} size="sm" />
        </View>
        <View style={themed($detailRow)}>
          <Text text="Interface" size="sm" color="textDim" style={themed($detailKey)} />
          <Text text={storageData.interfaceType} size="sm" />
        </View>
        <View style={themed($detailRow)}>
          <Text text="Capacity" size="sm" color="textDim" style={themed($detailKey)} />
          <Text text={storageData.capacity} size="sm" />
        </View>
        <View style={themed($detailRow)}>
          <Text text="Used Space" size="sm" color="textDim" style={themed($detailKey)} />
          <View style={$usedSpaceContainer}>
            <ProgressBar value={storageData.percentageUsed} style={$inlineProgress} />
            <Text text={storageData.usedSpace} size="xs" color="textDim" />
          </View>
        </View>
      </Card>

      {/* S.M.A.R.T. Details */}
      <Card style={themed($card)}>
        <Pressable style={themed($sectionHeaderPressable)} onPress={() => setShowSmart(!showSmart)}>
          <Text text="S.M.A.R.T. Data" size="md" weight="semiBold"  />
          <Text text={showSmart ? "▼" : "▶"} size="sm" />
        </Pressable>
        
        {showSmart && (
          <View style={themed($smartList)}>
            {S_MART_DATA.map((item) => (
              <View
                key={item.name}
                style={[
                  themed($smartRow),
                  item.status === "warning" && themed($smartRowWarning),
                  item.status === "error" && themed($smartRowError),
                ]}
              >
                <Text text={item.name} size="sm"  />
                <Text text={item.value} size="sm" style={$smartValue} />
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Partitions */}
      <Card style={themed($card)}>
        <Text text="Partitions" size="md" weight="semiBold"  />
        
        {PARTITIONS.map((partition) => (
          <View key={partition.mountPoint} style={themed($partitionRow)}>
            <View style={themed($partitionIcon)}>
              <Text text="📁" size="lg" />
            </View>
            <View style={themed($partitionCenter)}>
              <Text text={partition.mountPoint} size="sm" weight="medium" />
              <Text text={partition.filesystem} size="xs" color="textDim" />
            </View>
            <View style={themed($partitionRight)}>
              <View style={themed($partitionProgressContainer)}>
                <ProgressBar
                  value={partition.percentage}
                  color={partition.percentage > 90 ? "#EF4444" : partition.percentage > 70 ? "#F59E0B" : "#06B6D4"}
                  style={themed($partitionProgress)}
                />
              </View>
              <Text text={`${partition.used} / ${partition.total}`} size="xs" color="textDim" />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginHorizontal: spacing.md, marginBottom: spacing.md })
const $sectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm })

const $healthBadge: ViewStyle = { alignItems: "center", marginBottom: 12 }
const $healthBadgeInner: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }
const $typeLabel: ViewStyle = { marginTop: 4 }

const $metricsGrid: ViewStyle = { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 }
const $metricCard: ViewStyle = { width: "50%", paddingHorizontal: 8, marginBottom: 8 }

const $sectionTitle: ViewStyle = { marginBottom: 12 }
const $sectionHeaderPressable: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }

const $detailRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }
const $detailKey: ViewStyle = { width: 80 }
const $smartValue: TStyle = { fontFamily: "monospace" }
const $usedSpaceContainer: ViewStyle = { flex: 1, alignItems: "flex-end", gap: 4 }
const $inlineProgress: ViewStyle = { width: "100%", height: 4 }

const $smartList: ViewStyle = {}
const $smartRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderLeftWidth: 4, borderLeftColor: "transparent", paddingLeft: 8 }
const $smartRowWarning: ViewStyle = { borderLeftColor: "#F59E0B" }
const $smartRowError: ViewStyle = { borderLeftColor: "#EF4444" }

const $partitionRow: ViewStyle = { flexDirection: "row", alignItems: "center", paddingVertical: 12 }
const $partitionIcon: ViewStyle = { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $partitionCenter: ViewStyle = { flex: 1 }
const $partitionRight: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $partitionProgressContainer: ViewStyle = { width: 80 }
const $partitionProgress: ViewStyle = { height: 4 }
