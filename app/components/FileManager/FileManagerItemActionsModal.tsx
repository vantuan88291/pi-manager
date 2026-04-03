import { FC } from "react"
import { View, ViewStyle, Pressable } from "react-native"
import { useTranslation } from "react-i18next"

import { ActionModal } from "@/components/ActionModal"
import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { FileInfo } from "../../../shared/types/file-manager"

export interface FileManagerItemActionsModalProps {
  visible: boolean
  item: FileInfo | null
  onClose: () => void
  onRenamePress: () => void
  onMovePress: () => void
  onDeletePress: () => void
}

export const FileManagerItemActionsModal: FC<FileManagerItemActionsModalProps> = ({
  visible,
  item,
  onClose,
  onRenamePress,
  onMovePress,
  onDeletePress,
}) => {
  const { t } = useTranslation()
  const { themed } = useAppTheme()

  if (!item) return null

  return (
    <ActionModal
      visible={visible}
      onClose={onClose}
      title={item.name}
      bottomComponent={
        <Button
          tx="common:cancel"
          preset="default"
          onPress={onClose}
          style={themed($cancelFooterButton)}
        />
      }
    >
      <View style={themed($actions)}>
        <Pressable
          onPress={onRenamePress}
          style={({ pressed }) => themed([$actionRow, pressed && $actionRowPressed])}
        >
          <Text tx="fileManager:rename" size="md" color="text" />
        </Pressable>
        <Pressable
          onPress={onMovePress}
          style={({ pressed }) => themed([$actionRow, pressed && $actionRowPressed])}
        >
          <Text tx="fileManager:move" size="md" color="text" />
        </Pressable>
        <Pressable
          onPress={onDeletePress}
          style={({ pressed }) => themed([$actionRow, pressed && $actionRowPressed])}
        >
          <Text text={t("common:delete")} size="md" color="error" />
        </Pressable>
      </View>
    </ActionModal>
  )
}

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
})

const $actionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  borderRadius: spacing.sm,
})

const $actionRowPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
})

const $cancelFooterButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})
