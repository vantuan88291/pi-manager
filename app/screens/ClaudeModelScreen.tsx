import { FC, useCallback, useEffect, useState } from "react"
import { ActivityIndicator, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { Card } from "@/components/Card"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { fetchClaudeModel, setClaudeModel } from "@/services/api/claudeModel"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { AppStackParamList } from "@/navigators/navigationTypes"

type ClaudeModelScreenProps = NativeStackScreenProps<AppStackParamList, "ClaudeModel">

export const ClaudeModelScreen: FC<ClaudeModelScreenProps> = function ClaudeModelScreen({
  navigation,
}) {
  const { themed, theme } = useAppTheme()

  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const data = await fetchClaudeModel()
      setCurrentModel(data.model)
      setAvailableModels(data.availableModels)
      setSelectedModel(data.model)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleApply = async () => {
    if (!selectedModel || selectedModel === currentModel) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await setClaudeModel(selectedModel)
      setCurrentModel(res.data.model)
      setSuccessMsg(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change model")
    } finally {
      setSaving(false)
    }
  }

  const hasChange = selectedModel !== null && selectedModel !== currentModel

  return (
    <Screen preset="scroll">
      <Header
        titleTx="claudeModel:title"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        titleMode="center"
      />

      <View style={themed($content)}>
        {/* Current model card */}
        <Card
          headingTx="claudeModel:currentModel"
          style={themed($card)}
          ContentComponent={
            loading ? (
              <View style={$centered}>
                <ActivityIndicator color={theme.colors.tint} />
              </View>
            ) : (
              <View style={themed($currentModelRow)}>
                <View style={[themed($modelBadge), { backgroundColor: theme.colors.tint + "22" }]}>
                  <Text
                    text={currentModel ?? "—"}
                    weight="semiBold"
                    size="sm"
                    style={{ color: theme.colors.tint }}
                  />
                </View>
              </View>
            )
          }
        />

        {/* Model selector card */}
        {availableModels.length > 0 && (
          <Card
            headingTx="claudeModel:selectModel"
            style={themed($card)}
            ContentComponent={
              <View>
                {availableModels.map((model) => {
                  const isSelected = model === selectedModel
                  const isCurrent = model === currentModel
                  return (
                    <TouchableOpacity
                      key={model}
                      style={[
                        themed($modelItem),
                        isSelected && {
                          backgroundColor: theme.colors.tint + "18",
                          borderColor: theme.colors.tint,
                        },
                      ]}
                      onPress={() => setSelectedModel(model)}
                      activeOpacity={0.7}
                    >
                      <View style={$modelItemContent}>
                        <View style={$radioOuter}>
                          <View
                            style={[
                              $radioInner,
                              {
                                borderColor: isSelected
                                  ? theme.colors.tint
                                  : theme.colors.separator,
                              },
                            ]}
                          >
                            {isSelected && (
                              <View
                                style={[$radioDot, { backgroundColor: theme.colors.tint }]}
                              />
                            )}
                          </View>
                        </View>
                        <View style={$modelTextGroup}>
                          <Text text={model} weight={isSelected ? "semiBold" : "normal"} size="sm" color="text" />
                          {isCurrent && (
                            <Text
                              tx="claudeModel:activeBadge"
                              size="xxs"
                              style={{ color: theme.colors.tint }}
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            }
          />
        )}

        {/* Error / Success feedback */}
        {!!error && (
          <Text text={error} color="error" size="xs" style={themed($feedbackText)} />
        )}
        {!!successMsg && (
          <Text text={successMsg} size="xs" style={[themed($feedbackText), { color: "#10B981" }]} />
        )}

        {/* Apply button */}
        {hasChange && (
          <TouchableOpacity
            style={[themed($applyButton), { backgroundColor: theme.colors.tint }]}
            onPress={handleApply}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text tx="claudeModel:applyButton" weight="semiBold" size="sm" style={$applyButtonText} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
})

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  marginBottom: spacing.md,
})

const $currentModelRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.xs,
})

const $modelBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignSelf: "flex-start",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 8,
})

const $modelItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: colors.border,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  marginBottom: spacing.xs,
})

const $modelItemContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $radioOuter: ViewStyle = {
  marginRight: 12,
}

const $radioInner: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  justifyContent: "center",
  alignItems: "center",
}

const $radioDot: ViewStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
}

const $modelTextGroup: ViewStyle = {
  flex: 1,
  gap: 2,
}

const $feedbackText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $applyButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderRadius: 12,
  paddingVertical: spacing.md,
  alignItems: "center",
  justifyContent: "center",
  marginTop: spacing.xs,
})

const $applyButtonText: TextStyle = {
  color: "#fff",
}

const $centered: ViewStyle = {
  paddingVertical: 12,
  alignItems: "center",
}
