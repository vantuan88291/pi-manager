import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error"

interface ConnectionBadgeProps {
  /** Connection status */
  status: ConnectionStatus
  /** Style overrides */
  style?: ViewStyle
}

const statusConfig: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "#10B981", label: "Connected" },
  connecting: { color: "#F59E0B", label: "Connecting..." },
  disconnected: { color: "#EF4444", label: "Offline" },
  error: { color: "#EF4444", label: "Error" },
}

export const ConnectionBadge: FC<ConnectionBadgeProps> = ({ status, style }) => {
  const { themed } = useAppTheme()
  const config = statusConfig[status]

  return (
    <View style={[themed($container), style]}>
      <View style={[$dot, { backgroundColor: config.color }]} />
      <Text text={config.label} size="xs" color="textDim" />
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $dot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}
