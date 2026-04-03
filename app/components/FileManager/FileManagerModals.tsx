import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { AlertModal } from "@/components/AlertModal"
import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { FileManagerActionMenuState, FileManagerAlertState } from "./types"

export interface FileManagerModalsProps {
  actionMenu: FileManagerActionMenuState
  onCloseActionMenu: () => void
  onActionMenuDelete: () => void
  alertConfig: FileManagerAlertState
  onDismissAlert: () => void
  createModalVisible: boolean
  createType: "folder" | "file"
  newItemName: string
  onNewItemNameChange: (text: string) => void
  onCloseCreateModal: () => void
  onCreateConfirm: () => void
}

export const FileManagerModals: FC<FileManagerModalsProps> = ({
  actionMenu,
  onCloseActionMenu,
  onActionMenuDelete,
  alertConfig,
  onDismissAlert,
  createModalVisible,
  createType,
  newItemName,
  onNewItemNameChange,
  onCloseCreateModal,
  onCreateConfirm,
}) => {
  const { t } = useTranslation()
  const { themed } = useAppTheme()

  const typeNoun =
    createType === "folder" ? t("fileManager:typeNounFolder") : t("fileManager:typeNounFile")
  const createTitle =
    createType === "folder" ? t("fileManager:newFolder") : t("fileManager:newFile")
  const createMessage = t("fileManager:enterTypeName", { type: typeNoun })
  const createPlaceholder =
    createType === "folder"
      ? t("fileManager:placeholderFolderName")
      : t("fileManager:placeholderFileName")

  return (
    <>
      <AlertModal
        visible={actionMenu.visible && !!actionMenu.item}
        title={actionMenu.item?.name || ""}
        buttons={[
          { text: t("common:cancel"), style: "cancel", onPress: onCloseActionMenu },
          { text: t("common:delete"), style: "destructive", onPress: onActionMenuDelete },
        ]}
        onClose={onCloseActionMenu}
      />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={onDismissAlert}
      />

      <AlertModal
        visible={createModalVisible}
        title={createTitle}
        message={createMessage}
        buttons={[
          { text: t("common:cancel"), style: "cancel", onPress: onCloseCreateModal },
          {
            text: t("common:ok"),
            style: "default",
            onPress: onCreateConfirm,
          },
        ]}
        onClose={onCloseCreateModal}
      >
        <View style={themed($inputContainer)}>
          <TextField
            value={newItemName}
            onChangeText={onNewItemNameChange}
            placeholder={createPlaceholder}
            autoFocus
            onSubmitEditing={onCreateConfirm}
          />
        </View>
      </AlertModal>
    </>
  )
}

const $inputContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
})
