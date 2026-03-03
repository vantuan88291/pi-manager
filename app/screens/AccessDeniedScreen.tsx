import { FC } from "react"
import { View, ViewStyle } from "react-native"

import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const AccessDeniedScreen: FC = function AccessDeniedScreen() {
  const { themed, theme } = useAppTheme()

  const handleRetry = () => {
    console.log("Retry connection")
  }

  return (
    <Screen preset="fixed">
      <Header title="Access Denied" titleMode="center" />

      <View style={themed($container)}>
        <View style={themed($iconContainer)}>
          <Icon font="Ionicons" icon="lock-closed" color={theme.colors.error} size={80} />
        </View>

        <Text text="Access Denied" size="xl" weight="bold" color="text" style={themed($title)} />

        <Text
          text="Your Telegram account is not authorized to use this app. Contact the device owner to request access."
          size="md"
          color="textDim"
          style={themed($body)}
        />

        <Button text="Retry" preset="default" onPress={handleRetry} style={$button} />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xl })
const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.xl })
const $title: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.md, textAlign: "center" })
const $body: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginBottom: spacing.xl, textAlign: "center", lineHeight: 24 })
const $button: ViewStyle = { minWidth: 120 }
