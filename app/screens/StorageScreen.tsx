import { FC, useState, useEffect, useMemo } from "react"
import { View, ViewStyle, RefreshControl } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { ProgressBar } from "@/components/ProgressBar"
import { Icon } from "@/components/Icon"
import { Badge } from "@/components/Badge"
import { useAppTheme } from "@/theme/context"
import { getFeatureColor } from "@/theme/featureColors"
import { useSocket } from "@/services/socket/SocketContext"
import { storageClientModule } from "@/services/socket/modules/storage"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { StorageStatus, Partition } from "../../../shared/types/storage"

type StorageScreenProps = Omit<AppStackScreenProps<"Storage">, "navigation">

export const StorageScreen: FC<StorageScreenProps> = function StorageScreen() {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { accent: storageAccent } = getFeatureColor("storage", theme.isDark)
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filter out tmpfs and sort by usage
  const filteredPartitions = useMemo(() => {
    if (!storageStatus?.partitions) return []
    return storageStatus.partitions
      .filter(p => !p.filesystem.includes('tmpfs') && p.size > 0)
      .sort((a, b) => b.percent - a.percent)
  }, [storageStatus?.partitions])

  // Subscribe to Storage module
  useEffect(() => {
    subscribeToModule("storage")
    
    const unsubStatus = storageClientModule.onStatus((status) => {
      setStorageStatus(status)
    })
    
    return () => {
      unsubStatus()
      unsubscribeFromModule("storage")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const handleRefresh = async () => {
    try {
    setRefreshing(true)
    await storageClientModule.refresh()
    setTimeout(() => setRefreshing(false), 1000)
    } catch (error) {
      console.error("[StorageScreen] refresh error:", error)
    }
  }

  const getHealthStatus = (percentageUsed: number) => {
    if (percentageUsed < 80) return { label: t("storage:health.good"), color: theme.colors.success, icon: "checkmark-circle" }
    if (percentageUsed < 95) return { label: t("storage:health.warning"), color: theme.colors.warning, icon: "alert-circle" }
    return { label: t("storage:health.critical"), color: theme.colors.error, icon: "close-circle" }
  }

  const getWarningLevel = (health: StorageStatus['health']) => {
    if (!health) return { level: 'none', count: 0 }
    
    let count = 0
    if (health.criticalWarning > 0) count++
    if (health.mediaErrors > 0) count++
    if (health.unsafeShutdowns > 10) count++
    if (health.availableSpare < health.availableSpareThreshold) count++
    
    if (count === 0) return { level: 'none', count: 0 }
    if (count <= 2) return { level: 'warning', count }
    return { level: 'critical', count }
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  // Fix: Convert Kelvin to Celsius (NVMe returns temperature in Kelvin)
  const formatTemperature = (temp: number) => {
    // NVMe returns temperature in Kelvin (0-65535)
    // Convert to Celsius: C = K - 273.15
    const celsius = temp > 200 ? temp - 273.15 : temp
    return `${Math.round(celsius)}°C`
  }

  const health = storageStatus?.health
  const healthStatus = health ? getHealthStatus(health.percentageUsed) : null
  const warningLevel = getWarningLevel(health)

  return (
    <Screen preset="scroll" ScrollViewProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> }}>
      <Header titleTx="storage:title" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Health Overview Card */}
      {health && (
        <Card
          headingTx="storage:healthOverview"
          style={themed($card)}
          ContentComponent={
            <View>
              <View style={[$healthHeader, { backgroundColor: healthStatus?.color + "15" }]}>
                <View style={[$healthIconBadge, { backgroundColor: healthStatus?.color + "20" }]}>
                  <Icon 
                    font="Ionicons" 
                    icon={healthStatus?.icon || "checkmark-circle"} 
                    color={healthStatus?.color || theme.colors.text} 
                    size={24} 
                  />
                </View>
                <View style={$healthInfo}>
                  <Text tx="storage:healthStatus" size="sm" color="textDim" weight="medium" />
                  <Text text={healthStatus?.label || "Unknown"} size="lg" weight="semiBold" color={healthStatus?.color || theme.colors.text} />
                </View>
                {warningLevel.count > 0 && (
                  <Badge 
                    text={`${warningLevel.count} ${t("storage:warnings")}`} 
                    color={warningLevel.level === 'critical' ? theme.colors.error : theme.colors.warning}
                  />
                )}
              </View>
              
              <Text text={storageStatus?.model || "NVMe SSD"} size="md" weight="semiBold" color="text" style={{ marginTop: 16 }} />
              <Text text={`${storageStatus?.interface || "NVMe"} • ${storageStatus?.serial ? storageStatus.serial.slice(0, 8) + "..." : ""}`} size="sm" color="textDim" />
              
              <View style={$statsGrid}>
                <StatItem 
                  icon="💾" 
                  value={formatBytes(storageStatus?.capacity || 0)} 
                  labelTx="storage:capacity"
                  badgeColor="#EFF6FF"
                />
                <StatItem 
                  icon="🌡️" 
                  value={formatTemperature(health.temperature)} 
                  labelTx="storage:temperature"
                  badgeColor={health.temperature > 32315 ? "#FEF2F2" : "#FFFBEB"}
                  valueColor={health.temperature > 32315 ? theme.colors.error : theme.colors.text}
                />
                <StatItem 
                  icon="⏱️" 
                  value={`${Math.round(health.powerOnHours / 24)}d`} 
                  labelTx="storage:powerOn"
                  badgeColor="#F5F3FF"
                />
              </View>
              
              <View style={{ marginTop: 16 }}>
                <View style={$progressLabel}>
                  <Text tx="storage:lifespanUsed" size="sm" color="textDim" weight="medium" />
                  <Text text={`${health.percentageUsed}%`} size="sm" weight="semiBold" color="text" />
                </View>
                <ProgressBar 
                  progress={health.percentageUsed / 100} 
                  color={healthStatus?.color || storageAccent} 
                  style={{ marginTop: 8 }} 
                />
                <Text tx="storage:lifespanRemaining" size="xs" color="textDim" style={{ marginTop: 6 }} />
              </View>
            </View>
          }
        />
      )}

      {/* S.M.A.R.T. Details Card */}
      {health && (
        <Card
          headingTx="storage:smartData"
          style={themed([$card, $section])}
          ContentComponent={
            <View>
              <SmartDetailRow 
                labelTx="storage:criticalWarning" 
                value={health.criticalWarning.toString()} 
                icon={health.criticalWarning > 0 ? "alert-circle" : "checkmark-circle"}
                warning={health.criticalWarning > 0}
                iconColor={health.criticalWarning > 0 ? theme.colors.error : theme.colors.success}
              />
              <SmartDetailRow 
                labelTx="storage:mediaErrors" 
                value={health.mediaErrors.toString()} 
                icon={health.mediaErrors > 0 ? "warning" : "checkmark-circle"}
                warning={health.mediaErrors > 0}
                iconColor={health.mediaErrors > 0 ? theme.colors.error : theme.colors.success}
              />
              <SmartDetailRow 
                labelTx="storage:unsafeShutdowns" 
                value={health.unsafeShutdowns.toString()} 
                icon={health.unsafeShutdowns > 10 ? "flash-off" : "flash"}
                warning={health.unsafeShutdowns > 10}
                iconColor={health.unsafeShutdowns > 10 ? theme.colors.warning : theme.colors.success}
              />
              <SmartDetailRow 
                labelTx="storage:availableSpare" 
                value={`${health.availableSpare}%`} 
                icon={health.availableSpare < health.availableSpareThreshold ? "battery-charging" : "battery-full"}
                warning={health.availableSpare < health.availableSpareThreshold}
                iconColor={health.availableSpare < health.availableSpareThreshold ? theme.colors.error : theme.colors.success}
              />
              <SmartDetailRow 
                labelTx="storage:errorLogEntries" 
                value={health.errorLogEntries.toString()} 
                icon="document-text"
                warning={health.errorLogEntries > 100}
                iconColor={health.errorLogEntries > 100 ? theme.colors.warning : theme.colors.textDim}
              />
              <SmartDetailRow 
                labelTx="storage:dataWritten" 
                value={formatBytes(health.dataUnitsWritten * 512000)} 
                icon="arrow-down-circle"
                iconColor={theme.colors.textDim}
              />
            </View>
          }
        />
      )}

      {/* Partitions Card */}
      <Card
        headingTx="storage:partitions"
        style={themed([$card, $section])}
        ContentComponent={
          <View>
            {filteredPartitions.length > 0 ? (
              filteredPartitions.map((partition, index) => (
                <PartitionRow 
                  key={partition.mount} 
                  partition={partition} 
                  isLast={index === filteredPartitions.length - 1}
                />
              ))
            ) : (
              <View style={$emptyState}>
                <Text text="💾" size="xl" />
                <Text tx="storage:noPartitions" size="sm" color="textDim" style={{ marginTop: 8 }} />
              </View>
            )}
          </View>
        }
      />
    </Screen>
  )
}

function StatItem({ icon, value, labelTx, badgeColor, valueColor }: { 
  icon: string, 
  value: string, 
  labelTx: string,
  badgeColor: string,
  valueColor?: string
}) {
  const { theme } = useAppTheme()
  
  return (
    <View style={$statItem}>
      <View style={[$statIconBadge, { backgroundColor: badgeColor }]}>
        <Text text={icon} size="lg" />
      </View>
      <Text text={value} size="sm" weight="semiBold" color={valueColor || theme.colors.text} style={{ marginTop: 8 }} />
      <Text tx={labelTx} size="xs" color="textDim" />
    </View>
  )
}

function SmartDetailRow({ labelTx, value, icon, warning = false, iconColor }: { 
  labelTx: string, 
  value: string, 
  icon: string,
  warning?: boolean,
  iconColor?: string
}) {
  const { themed, theme } = useAppTheme()
  
  return (
    <View style={themed([$detailRow, $borderTop])}>
      <View style={$detailLeft}>
        <Icon font="Ionicons" icon={icon} color={iconColor || (warning ? theme.colors.error : theme.colors.success)} size={18} />
        <Text tx={labelTx} size="sm" color="textDim" style={{ marginLeft: 8 }} />
      </View>
      <Text text={value} size="sm" weight="semiBold" color={warning ? theme.colors.error : theme.colors.text} />
    </View>
  )
}

function PartitionRow({ partition, isLast }: { partition: Partition, isLast: boolean }) {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  
  const getProgressColor = (percent: number) => {
    if (percent < 70) return theme.colors.success
    if (percent < 90) return theme.colors.warning
    return theme.colors.error
  }
  
  // Truncate long mount paths
  const truncateMount = (mount: string) => {
    if (mount.length <= 20) return mount
    const parts = mount.split('/')
    if (parts.length <= 3) return mount
    return '/' + parts.slice(1, -1).map(p => p.slice(0, 3)).join('/') + '/' + parts[parts.length - 1]
  }
  
  return (
    <View style={!isLast && themed($borderTop)}>
      <View style={[$partitionRow, { paddingVertical: 12 }]}>
        <View style={$partitionLeft}>
          <View style={[$partitionIcon, { backgroundColor: theme.colors.palette.neutral200 }]}>
            <Icon font="Ionicons" icon="folder" color={theme.colors.textDim} size={16} />
          </View>
          <View style={$partitionInfo}>
            <Text 
              text={truncateMount(partition.mount)} 
              weight="semiBold" 
              color="text" 
              numberOfLines={1}
              ellipsizeMode="tail"
            />
            <Text 
              text={`${partition.filesystem} • ${formatBytes(partition.used)} / ${formatBytes(partition.size)}`} 
              size="xs" 
              color="textDim"
              numberOfLines={1}
            />
          </View>
        </View>
        <View style={$partitionRight}>
          <Text text={`${partition.percent}%`} size="sm" weight="bold" color={getProgressColor(partition.percent)} />
        </View>
      </View>
      
      <ProgressBar 
        progress={partition.percent / 100} 
        color={getProgressColor(partition.percent)} 
        style={{ marginTop: 8 }} 
      />
    </View>
  )
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(1)} GB`
}

const $card: ViewStyle = { marginHorizontal: 16, marginVertical: 8 }
const $section: ViewStyle = { marginTop: 8 }
const $healthHeader: ViewStyle = { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, gap: 12 }
const $healthIconBadge: ViewStyle = { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }
const $healthInfo: ViewStyle = { flex: 1 }
const $statsGrid: ViewStyle = { flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingVertical: 12 }
const $statItem: ViewStyle = { alignItems: "center" }
const $statIconBadge: ViewStyle = { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }
const $progressLabel: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }
const $detailRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }
const $detailLeft: ViewStyle = { flexDirection: "row", alignItems: "center", flex: 1 }
const $borderTop: ViewStyle = { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", paddingTop: 12 }
const $partitionRow: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }
const $partitionLeft: ViewStyle = { flexDirection: "row", alignItems: "center", flex: 1 }
const $partitionIcon: ViewStyle = { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $partitionInfo: ViewStyle = { flex: 1 }
const $partitionRight: ViewStyle = { alignItems: "flex-end" }
const $emptyState: ViewStyle = { alignItems: "center", paddingVertical: 32 }
