import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Icon, FontFamily } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { ProgressBar } from "./ProgressBar"
import { SkeletonLoader } from "./SkeletonLoader"

interface StatCardProps {
  label: string
  value: string
  unit?: string
  progress?: number
  progressColor?: string
  caption?: string
  icon?: { font: FontFamily; name: string; color: string; badgeBg: string }
  loading?: boolean
}

export const StatCard: FC<StatCardProps> = ({ label, value, unit, progress, progressColor, caption, icon, loading }) => {
  const { themed, theme } = useAppTheme()

  if (loading) {
    return (
      <View style={themed($container)}>
        <SkeletonLoader width={40} height={40} borderRadius={12} />
        <View style={$valueRow}>
          <SkeletonLoader width={60} height={28} borderRadius={4} />
        </View>
        <SkeletonLoader width="100%" height={6} borderRadius={3} />
      </View>
    )
  }

  return (
    <View style={themed($container)}>
      {icon && (
        <View style={[$iconBadge, { backgroundColor: icon.badgeBg }]}>
          <Icon font={icon.font} icon={icon.name} color={icon.color} size={20} />
        </View>
      )}
      <Text text={label} size="xs" color="textDim" style={$label} />
      <View style={$valueRow}>
        <Text text={value} size="xl" weight="bold" style={themed($value)} />
        {unit && <Text text={unit} size="sm" color="textDim" style={$unit} />}
      </View>
      {progress !== undefined && <ProgressBar value={progress} color={progressColor} style={$progressBar} />}
      {caption && <Text text={caption} size="xs" color="textDim" style={$caption} />}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 140 })
const $iconBadge: ViewStyle = { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 }
const $label: ViewStyle = { marginBottom: 4 }
const $valueRow: ViewStyle = { flexDirection: "row", alignItems: "baseline", marginBottom: 8 }
const $value = { color: "#1E293B" as any, fontSize: 28 }
const $unit: ViewStyle = { marginLeft: 4 }
const $progressBar: ViewStyle = { marginBottom: 4 }
const $caption: ViewStyle = { marginTop: 4 }
