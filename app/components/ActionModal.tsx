import { FC, ReactNode } from "react"
import { View, ViewStyle, TextStyle, Pressable, Modal as RNModal } from "react-native"

import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"
import { Button } from "./Button"

interface ActionModalProps {
  visible: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  bottomComponent?: ReactNode
}

export const ActionModal: FC<ActionModalProps> = ({
  visible,
  onClose,
  title,
  children,
  bottomComponent,
}) => {
  const { theme } = useAppTheme()

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={$overlay}>
        <Pressable style={$backdrop} onPress={onClose} />
        <View style={[$content, { backgroundColor: theme.colors.surface }]}>
          <Text
            text={title}
            size="lg"
            weight="semiBold"
            color="text"
            style={$title}
          />
          
          {children && <View style={$body}>{children}</View>}
          
          {bottomComponent && <View style={$footer}>{bottomComponent}</View>}
        </View>
      </View>
    </RNModal>
  )
}

const $overlay: ViewStyle = { flex: 1, justifyContent: "flex-end" }
const $backdrop: ViewStyle = { 
  position: "absolute", 
  top: 0, left: 0, right: 0, bottom: 0, 
  backgroundColor: "rgba(0,0,0,0.5)" 
}
const $content: ViewStyle = { 
  borderTopLeftRadius: 20, 
  borderTopRightRadius: 20, 
  padding: 20,
  paddingBottom: 34, // Account for safe area
}
const $title: TextStyle = { marginBottom: 16 }
const $body: ViewStyle = { marginBottom: 16 }
const $footer: ViewStyle = { gap: 12 }
