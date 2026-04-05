import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, View, ViewStyle, TextStyle } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { fetchUsageTracker, type UsageTrackerConnection } from "@/services/api/usageTracker"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { ProgressBar } from "@/components/ProgressBar"

type UsageTrackerScreenProps = NativeStackScreenProps<AppStackParamList, "UsageTracker">

const formatNumber = (value: number) => new Intl.NumberFormat().format(value)

export const UsageTrackerScreen: FC<UsageTrackerScreenProps> = function UsageTrackerScreen({
  navigation,
}) {
  const { themed } = useAppTheme()

  const [connections, setConnections] = useState<UsageTrackerConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConnections = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUsageTracker()
      setConnections(data.connections ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  return (
    <Screen
      preset="scroll"
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={loadConnections} />
        ),
      }}
    >
      <Header
        titleTx="usageTracker:title"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        titleMode="center"
      />

      <View style={themed($content)}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={themed((theme) => theme.colors.tint)}
            style={themed($loading)}
          />
        )}
        {error && (
          <Text text={error} color="error" size="xs" style={themed($message)} />
        )}

        {connections.map((conn) => (
          <Card
            key={conn.id}
            heading={conn.provider}
            style={themed($card)}
            ContentComponent={<ConnectionDetails connection={conn} />}
          />
        ))}
      </View>
    </Screen>
  )
}

function ConnectionDetails({ connection }: { connection: UsageTrackerConnection }) {
  const { themed } = useAppTheme()

  const session = connection.quotas?.session
  const weekly = connection.quotas?.weekly
  const hasQuotas = Boolean(session || weekly)

  return (
    <View style={themed($connection)}>
      {connection.name && (
        <Text
          text={connection.name}
          size="xs"
          color="textDim"
          style={themed($accountName)}
        />
      )}
      <Text
        tx="usageTracker:plan"
        txOptions={{ plan: connection.plan ?? "—" }}
        size="xs"
        color="textDim"
      />
      {hasQuotas ? (
        <View style={themed($quotaRow)}>
          <QuotaLabel labelTx="usageTracker:sessionQuota" quota={session} themed={themed} />
          <QuotaLabel labelTx="usageTracker:weeklyQuota" quota={weekly} themed={themed} />
        </View>
      ) : (
        <Text tx="usageTracker:notSupported" size="xs" color="textDim" style={themed($message)} />
      )}
    </View>
  )
}

type QuotaLabelProps = {
  labelTx: string
  quota?: UsageTrackerConnection["quotas"]["session"]
  themed: ReturnType<typeof useAppTheme>["themed"]
}

function QuotaLabel({ labelTx, quota, themed }: QuotaLabelProps) {
  if (!quota) {
    return (
      <View style={themed($quotaBlock)}>
        <Text tx="usageTracker:notSupported" size="xs" color="textDim" />
      </View>
    )
  }

  const resetAt = quota.resetAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
        new Date(quota.resetAt),
      )
    : null

  const percent = quota.total > 0 ? (quota.used / quota.total) * 100 : 0
  const clamped = Math.max(0, Math.min(100, percent))
  const displayValue = Math.round(clamped)

  return (
    <View style={themed($quotaBlock)}>
      <Text tx={labelTx} size="xs" color="textDim" />
      <ProgressBar value={clamped} />
      <View style={themed($progressRow)}>
        <Text
          text={`${formatNumber(quota.used)} / ${formatNumber(quota.total)}`}
          weight="semiBold"
        />
        <Text text={`${displayValue}%`} size="xs" color="textDim" />
      </View>
      <Text
        text={quota.unlimited ? "Unlimited" : `Remaining ${formatNumber(quota.remaining)}`}
        size="xs"
        color="textDim"
      />
      {resetAt && (
        <Text
          tx="usageTracker:resetAt"
          txOptions={{ time: resetAt }}
          size="xs"
          color="textDim"
        />
      )}
    </View>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  padding: spacing.md,
})

const $message: ViewStyle = {
  marginBottom: 8,
}

const $connection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $accountName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.xxxs,
})

const $quotaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.sm,
})

const $quotaBlock: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.surface,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.sm,
  marginRight: spacing.xs,
})

const $progressRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.xxxs,
})
