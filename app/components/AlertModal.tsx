import { FC } from "react"
import { View, ViewStyle, Pressable } from "react-native"

import { useAppTheme } from "@/theme/context"

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
}

export const AlertModal: FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
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

  return (
    <ActionModal
      visible={visible}
      onClose={onClose}
      title={title}
      bottomComponent={
        <View style={themed($buttonContainer)}>
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
      {message && (
        <Text
          text={message}
          size="md"
          color="text"
          style={themed($message)}
        />
      )}
    </ActionModal>
  )
}

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  marginTop: spacing.lg,
  justifyContent: buttons.length === 1 ? "center" : "flex-end",
})

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
