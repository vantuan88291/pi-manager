import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { AlertModal } from "@/components/AlertModal"
import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import type { FileInfo } from "../../../shared/types/file-manager"
import { FileManagerItemActionsModal } from "./FileManagerItemActionsModal"
import type { FileManagerActionMenuState, FileManagerAlertState } from "./types"

export interface FileManagerModalsProps {
  actionMenu: FileManagerActionMenuState
  onCloseActionMenu: () => void
  onActionMenuDownload: () => void
  onActionMenuRename: () => void
  onActionMenuMove: () => void
  onActionMenuDelete: () => void
  alertConfig: FileManagerAlertState
  onDismissAlert: () => void
  createModalVisible: boolean
  createType: "folder" | "file"
  newItemName: string
  onNewItemNameChange: (text: string) => void
  onCloseCreateModal: () => void
  onCreateConfirm: () => void
  renameModal: { item: FileInfo; draft: string } | null
  onRenameDraftChange: (text: string) => void
  onCloseRenameModal: () => void
  onRenameConfirm: () => void
  moveModal: { item: FileInfo; destinationDir: string } | null
  onMoveDestinationChange: (text: string) => void
  onCloseMoveModal: () => void
  onMoveConfirm: () => void
}

export const FileManagerModals: FC<FileManagerModalsProps> = ({
  actionMenu,
  onCloseActionMenu,
  onActionMenuDownload,
  onActionMenuRename,
  onActionMenuMove,
  onActionMenuDelete,
  alertConfig,
  onDismissAlert,
  createModalVisible,
  createType,
  newItemName,
  onNewItemNameChange,
  onCloseCreateModal,
  onCreateConfirm,
  renameModal,
  onRenameDraftChange,
  onCloseRenameModal,
  onRenameConfirm,
  moveModal,
  onMoveDestinationChange,
  onCloseMoveModal,
  onMoveConfirm,
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
      <FileManagerItemActionsModal
        visible={actionMenu.visible && !!actionMenu.item}
        item={actionMenu.item}
        onClose={onCloseActionMenu}
        onDownloadPress={onActionMenuDownload}
        onRenamePress={onActionMenuRename}
        onMovePress={onActionMenuMove}
        onDeletePress={onActionMenuDelete}
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

      <AlertModal
        visible={!!renameModal}
        title={t("fileManager:renameTitle", { name: renameModal?.item.name ?? "" })}
        message={t("fileManager:renameHint")}
        buttons={[
          { text: t("common:cancel"), style: "cancel", onPress: onCloseRenameModal },
          { text: t("common:ok"), style: "default", onPress: onRenameConfirm },
        ]}
        onClose={onCloseRenameModal}
      >
        {!!renameModal && (
          <View style={themed($inputContainer)}>
            <TextField
              value={renameModal.draft}
              onChangeText={onRenameDraftChange}
              placeholder={t("fileManager:renamePlaceholder")}
              autoFocus
              onSubmitEditing={onRenameConfirm}
            />
          </View>
        )}
      </AlertModal>

      <AlertModal
        visible={!!moveModal}
        title={t("fileManager:moveTitle", { name: moveModal?.item.name ?? "" })}
        message={t("fileManager:moveHint")}
        buttons={[
          { text: t("common:cancel"), style: "cancel", onPress: onCloseMoveModal },
          { text: t("common:ok"), style: "default", onPress: onMoveConfirm },
        ]}
        onClose={onCloseMoveModal}
      >
        {!!moveModal && (
          <View style={themed($inputContainer)}>
            <TextField
              value={moveModal.destinationDir}
              onChangeText={onMoveDestinationChange}
              placeholder={t("fileManager:movePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onMoveConfirm}
            />
          </View>
        )}
      </AlertModal>
    </>
  )
}

const $inputContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
})
