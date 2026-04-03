import { FC, ReactNode } from "react"
import { View, ViewStyle, Pressable, ScrollView } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Text } from "./Text"
import { Button } from "./Button"
import { ActionModal } from "./ActionModal"

export interface AlertButton {
  text: string
  onPress?: () => void
  style?: "default" | "cancel" | "destructive"
}

interface AlertModalProps {
  visible: boolean
  title: string
  message?: string
  buttons: AlertButton[]
  onClose: () => void
  children?: ReactNode
}

export const AlertModal: FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
  children,
}) => {
  const { theme, themed } = useAppTheme()

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.()
    onClose()
  }

  const getButtonStyle = (button: AlertButton) => {
    if (button.style === "destructive") {
      return {
        preset: "default" as const,
        textStyle: { color: theme.colors.error },
      }
    }
    // Default or cancel style - both should look the same
    return {
      preset: "default" as const,
      textStyle: { color: theme.colors.text },
    }
  }

  const isSingleButton = buttons.length === 1
  const messageNeedsScroll = !!message && (message.length > 200 || message.includes("\n"))

  return (
    <ActionModal
      visible={visible}
      onClose={onClose}
      title={title}
      bottomComponent={
        <View style={themed([$buttonContainer, isSingleButton && $buttonContainerCenter])}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              txOptions={{ text: button.text }}
              text={button.text}
              onPress={() => handleButtonPress(button)}
              style={themed([$button, button.style !== "destructive" && $cancelButton])}
              {...getButtonStyle(button)}
            />
          ))}
        </View>
      }
    >
      {!!message &&
        (messageNeedsScroll ? (
          <ScrollView
            style={themed($messageScroll)}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <Text
              text={message}
              size="xs"
              color="text"
              style={themed($messageMultiline)}
              selectable
            />
          </ScrollView>
        ) : (
          <Text text={message} size="md" color="text" style={themed($message)} />
        ))}
      {children}
    </ActionModal>
  )
}

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  marginTop: spacing.lg,
  justifyContent: "flex-end",
})

const $buttonContainerCenter: ViewStyle = {
  justifyContent: "center",
}

const $button: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  minHeight: 48,
  borderRadius: spacing.md,
})

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
})

const $message: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  textAlign: "center",
  lineHeight: 24,
  paddingHorizontal: spacing.sm,
})

const $messageScroll: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 280,
})

const $messageMultiline: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  textAlign: "left",
  lineHeight: 20,
  paddingHorizontal: spacing.xs,
})
