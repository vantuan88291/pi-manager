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
    if (button.style === "cancel") {
      return {
        preset: "default" as const,
        textStyle: { color: theme.colors.textDim },
      }
    }
    return { preset: "primary" as const }
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
              style={$button}
              {...getButtonStyle(button)}
            />
          ))}
        </View>
      }
    >
      {message && (
        <Text
          text={message}
          size="sm"
          color="textDim"
          style={themed($message)}
        />
      )}
    </ActionModal>
  )
}

const $buttonContainer: ViewStyle = {
  flexDirection: "row",
  gap: 12,
  marginTop: 8,
}

const $button: ViewStyle = {
  flex: 1,
  minHeight: 44,
}

const $message: ViewStyle = {
  textAlign: "center",
  lineHeight: 20,
}
