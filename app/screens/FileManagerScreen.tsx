import { FC } from "react"
import { ActivityIndicator, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FileManagerHeader } from "@/components/FileManager/FileManagerHeader"
import { FileManagerListBody } from "@/components/FileManager/FileManagerListBody"
import { FileManagerModals } from "@/components/FileManager/FileManagerModals"
import { FileManagerWebUploadInput } from "@/components/FileManager/FileManagerWebUploadInput"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useFileManager } from "@/hooks/useFileManager"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type FileManagerScreenProps = NativeStackScreenProps<AppStackParamList, "FileManager">

export const FileManagerScreen: FC<FileManagerScreenProps> = function FileManagerScreen() {
  const navigation = useNavigation()
  const { themed, theme } = useAppTheme()
  const fm = useFileManager()

  return (
    <Screen preset="scroll">
      <Header titleTx="fileManager:title" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <View style={themed($contentWrapper)}>
        <FileManagerHeader
          currentPath={fm.currentPath}
          quickAccessPaths={fm.quickAccessPaths}
          uploading={fm.uploading}
          onGoUp={fm.handleGoUp}
          onQuickAccess={fm.handleQuickAccess}
          onCreateFolder={() => fm.handleCreate("folder")}
          onCreateFile={() => fm.handleCreate("file")}
          onUpload={fm.handleUpload}
        />

        <FileManagerListBody
          error={fm.error}
          loading={fm.loading}
          items={fm.items}
          onItemPress={fm.handleNavigate}
          onItemLongPress={fm.handleLongPress}
          onItemDelete={fm.handleDelete}
        />

        {!!fm.uploading && (
          <View style={themed($uploadOverlay)}>
            <View style={themed($uploadCard)}>
              <ActivityIndicator size="large" color={theme.colors.tint} />
              <Text
                tx="fileManager:uploading"
                size="sm"
                color="text"
                style={themed($uploadLabel)}
              />
            </View>
          </View>
        )}
      </View>

      <FileManagerModals
        actionMenu={fm.actionMenu}
        onCloseActionMenu={fm.closeActionMenu}
        onActionMenuRename={fm.handleActionMenuRename}
        onActionMenuMove={fm.handleActionMenuMove}
        onActionMenuDelete={fm.handleActionMenuDelete}
        alertConfig={fm.alertConfig}
        onDismissAlert={fm.dismissAlert}
        createModalVisible={fm.createModalVisible}
        createType={fm.createType}
        newItemName={fm.newItemName}
        onNewItemNameChange={fm.setNewItemName}
        onCloseCreateModal={fm.closeCreateModal}
        onCreateConfirm={fm.handleCreateConfirm}
        renameModal={fm.renameModal}
        onRenameDraftChange={fm.setRenameDraft}
        onCloseRenameModal={fm.closeRenameModal}
        onRenameConfirm={fm.handleRenameConfirm}
        moveModal={fm.moveModal}
        onMoveDestinationChange={fm.setMoveDestinationDir}
        onCloseMoveModal={fm.closeMoveModal}
        onMoveConfirm={fm.handleMoveConfirm}
      />

      <FileManagerWebUploadInput inputRef={fm.fileInputRef} onChange={fm.handleFileChange} />
    </Screen>
  )
}

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
  position: "relative",
})

const $uploadOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.palette.overlay50,
})

const $uploadCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.lg,
  borderRadius: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
})

const $uploadLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})
