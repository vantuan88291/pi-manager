import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { FileManagerHeader } from "@/components/FileManager/FileManagerHeader"
import { FileManagerListBody } from "@/components/FileManager/FileManagerListBody"
import { FileManagerModals } from "@/components/FileManager/FileManagerModals"
import { FileManagerWebUploadInput } from "@/components/FileManager/FileManagerWebUploadInput"
import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { useFileManager } from "@/hooks/useFileManager"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

type FileManagerScreenProps = NativeStackScreenProps<AppStackParamList, "FileManager">

export const FileManagerScreen: FC<FileManagerScreenProps> = function FileManagerScreen() {
  const navigation = useNavigation()
  const { themed } = useAppTheme()
  const fm = useFileManager()

  return (
    <Screen preset="scroll">
      <Header titleTx="fileManager:title" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <View style={themed($contentWrapper)}>
        <FileManagerHeader
          currentPath={fm.currentPath}
          quickAccessPaths={fm.quickAccessPaths}
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
      </View>

      <FileManagerModals
        actionMenu={fm.actionMenu}
        onCloseActionMenu={fm.closeActionMenu}
        onActionMenuDelete={fm.handleActionMenuDelete}
        alertConfig={fm.alertConfig}
        onDismissAlert={fm.dismissAlert}
        createModalVisible={fm.createModalVisible}
        createType={fm.createType}
        newItemName={fm.newItemName}
        onNewItemNameChange={fm.setNewItemName}
        onCloseCreateModal={fm.closeCreateModal}
        onCreateConfirm={fm.handleCreateConfirm}
      />

      <FileManagerWebUploadInput inputRef={fm.fileInputRef} onChange={fm.handleFileChange} />
    </Screen>
  )
}

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
})
