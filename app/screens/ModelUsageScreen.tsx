import { FC, useCallback, useEffect, useState } from "react"
import { RefreshControl, View, ViewStyle } from "react-native"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { fetchModelUsageHistory, type ModelUsageRequest } from "@/services/api/usage"
import type { AppStackParamList } from "@/navigators/navigationTypes"

type ModelUsageScreenProps = NativeStackScreenProps<AppStackParamList, "ModelUsage">

export const ModelUsageScreen: FC<ModelUsageScreenProps> = function ModelUsageScreen({
  navigation,
}) {
  const { t } = useTranslation()
  const { themed } = useAppTheme()

  const [requests, setRequests] = useState<ModelUsageRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchModelUsageHistory()
      setRequests(data.recentRequests ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  return (
    <Screen
      preset="scroll"
      ScrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={loadRequests} />
        ),
      }}
    >
      <Header
        titleTx="modelUsageScreen:title"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        titleMode="center"
      />

      <View style={themed($content)}>
        <Card
          headingTx="modelUsageScreen:recentRequests"
          style={themed($card)}
          ContentComponent={
            <View>
              {error && (
                <Text
                  text={error}
                  color="error"
                  size="xs"
                  style={themed($message)}
                />
              )}

              {loading && requests.length === 0 ? (
                <View style={themed($emptyState)}>
                  <Text tx="common:loading" color="textDim" size="sm" />
                </View>
              ) : !loading && requests.length === 0 ? (
                <View style={themed($emptyState)}>
                  <Text tx="modelUsageScreen:emptyState" color="textDim" size="sm" />
                </View>
              ) : (
                <View>
                  {requests.map((request, index) => (
                    <View key={`${request.model}-${request.timestamp}-${index}`}>
                      <ModelUsageListItem request={request} />
                      {index < requests.length - 1 && <View style={themed($divider)} />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          }
        />
      </View>
    </Screen>
  )
}

function ModelUsageListItem({ request }: { request: ModelUsageRequest }) {
  const { themed } = useAppTheme()

  return (
    <View style={themed($itemContainer)}>
      <View style={themed($itemHeader)}>
        <Text text={request.model} weight="semiBold" color="text" />
        <Text text={formatTimestamp(request.timestamp)} size="xs" color="textDim" />
      </View>
      <View style={themed($tokenRow)}>
        <Text
          tx="modelUsageScreen:promptTokens"
          txOptions={{ count: request.promptTokens }}
          size="xs"
          color="textDim"
        />
        <Text
          tx="modelUsageScreen:completionTokens"
          txOptions={{ count: request.completionTokens }}
          size="xs"
          color="textDim"
        />
      </View>
      <Text
        text={request.provider}
        size="xs"
        color="textDim"
        style={themed($provider)}
      />
    </View>
  )
}

function formatTimestamp(value: string) {
  try {
    return format(new Date(value), "Pp")
  } catch {
    return value
  }
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $message: ViewStyle = {
  marginBottom: 8,
}

const $emptyState: ViewStyle = {
  paddingVertical: 16,
  alignItems: "center",
}

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginVertical: spacing.md,
})

const $itemContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
})

const $itemHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xxxs,
})

const $tokenRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.xxxs,
})

const $provider: ViewStyle = {
  marginTop: 4,
}
