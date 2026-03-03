import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { TxKeyPath } from "@/i18n"

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error"

interface ConnectionBadgeProps {
  /** Connection status */
  status: ConnectionStatus
  /** Style overrides */
  style?: ViewStyle
}

const statusConfig: Record<ConnectionStatus, { color: string; labelTx: TxKeyPath }> = {
  connected: { color: "#10B981", labelTx: "common:connected" },
  connecting: { color: "#F59E0B", labelTx: "common:connecting" },
  disconnected: { color: "#EF4444", labelTx: "common:disconnected" },
  error: { color: "#EF4444", labelTx: "common:error" },
}

export const ConnectionBadge: FC<ConnectionBadgeProps> = ({ status, style }) => {
  const { themed } = useAppTheme()
  const config = statusConfig[status]

  return (
    <View style={[themed($container), style]}>
      <View style={[$dot, { backgroundColor: config.color }]} />
      <Text tx={config.labelTx} size="xs" color="textDim" />
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
