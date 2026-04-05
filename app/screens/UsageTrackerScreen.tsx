import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { RefreshControl, View, ViewStyle, TextStyle } from "react-native"
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
      <View style={themed($quotaRow)}>
        <QuotaLabel labelTx="usageTracker:sessionQuota" quota={session} themed={themed} />
        <QuotaLabel labelTx="usageTracker:weeklyQuota" quota={weekly} themed={themed} />
      </View>
    </View>
  )
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

  return (
    <View style={themed($quotaBlock)}>
      <Text tx={labelTx} size="xs" color="textDim" />
      <ProgressBar value={percent / 100} />
      <Text
        text={`${formatNumber(quota.used)} / ${formatNumber(quota.total)}`}
        weight="semiBold"
      />
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
