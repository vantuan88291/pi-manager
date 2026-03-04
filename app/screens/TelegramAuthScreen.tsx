import { FC, useEffect, useState } from "react"
import { View, ViewStyle, ActivityIndicator } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useSocket } from "@/services/socket/SocketContext"
import { isTelegramMiniApp, isWebBrowser, getInitData } from "@/services/telegram"

export const TelegramAuthScreen: FC = function TelegramAuthScreen({ navigation }) {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { state, connect } = useSocket()
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    const isTg = isTelegramMiniApp()
    const isWeb = isWebBrowser()
    const initData = getInitData()

    console.log("[TelegramAuth] isTg:", isTg, "isWeb:", isWeb, "hasInitData:", !!initData)

    if (isTg && initData) {
      // In Telegram with initData - auth
      console.log("[TelegramAuth] Connecting with Telegram initData")
      const tg = window.Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()
      }
      connect(initData)
    } else if (isWeb) {
      // In web browser - dev mode, connect without auth
      console.log("[TelegramAuth] Running in web browser (dev mode)")
      connect()
    } else {
      console.log("[TelegramAuth] Unknown environment")
      setErrorCode("NOT_IN_TELEGRAM")
    }
  }, [])

  // Handle connection errors
  useEffect(() => {
    if (state.status === "error") {
      setErrorCode(state.error || "UNKNOWN_ERROR")
    }
  }, [state.status, state.error])

  // Navigate to AccessDenied on specific errors
  useEffect(() => {
    if (errorCode === "ACCESS_DENIED") {
      navigation.navigate("AccessDenied")
    }
  }, [errorCode])

  if (errorCode && errorCode !== "ACCESS_DENIED") {
    return (
      <Screen preset="fixed">
        <Header titleTx="auth:error" titleMode="center" />
        <View style={themed($container)}>
          <Text text="❌" size="xxl" style={{ marginBottom: 16 }} />
          <Text tx={`auth:error_${errorCode.toLowerCase()}`} size="lg" weight="bold" color="text" style={themed($title)} />
          <Text text={state.error || "Unknown error"} size="md" color="textDim" style={themed($message)} />
          <Button tx="common:retry" preset="default" onPress={() => { setErrorCode(null); connect() }} style={$button} />
        </View>
      </Screen>
    )
  }

  // Loading state
  return (
    <Screen preset="fixed">
      <Header titleTx="auth:connecting" titleMode="center" />
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text tx="auth:waiting" size="md" color="textDim" style={themed($loadingText)} />
        {state.user && (
          <Text text={`👤 ${state.user.firstName}`} size="sm" color="text" style={themed($userInfo)} />
        )}
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.xl,
})

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
})

const $title: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.md, textAlign: "center" })
const $message: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.xl, textAlign: "center" })
const $button: ViewStyle = { minWidth: 120 }
const $loadingText: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.lg, textAlign: "center" })
const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.sm })
