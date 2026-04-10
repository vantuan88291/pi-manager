import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import type { AlertButton } from "@/components/AlertModal"
import type {
  FileManagerActionMenuState,
  FileManagerAlertState,
} from "@/components/FileManager/types"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { postJsonApi, postMultipartApi, RestApiError } from "@/services/api"
import { getTelegramWebApp } from "@/services/telegram"
import {
  fileManagerDeletePath,
  fileManagerGenerateDownloadToken,
  fileManagerListDirectory,
  fileManagerMovePath,
  fileManagerRenamePath,
} from "@/utils/fileManagerRest"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

import type { FileInfo, QuickAccessPath } from "../../shared/types/file-manager"
import { QUICK_ACCESS_PATHS } from "../../shared/types/file-manager"

const DEFAULT_HOME_PATH = "/home/vantuan88291"

export function useFileManager() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
  const { t } = useTranslation()

  const [currentPath, setCurrentPath] = useState(DEFAULT_HOME_PATH)
  const currentPathRef = useRef(currentPath)
  currentPathRef.current = currentPath

  const [items, setItems] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [quickAccessPaths] = useState<QuickAccessPath[]>(() => [...QUICK_ACCESS_PATHS])
  const [error, setError] = useState<string | null>(null)

  const [alertConfig, setAlertConfig] = useState<FileManagerAlertState>({
    visible: false,
    title: "",
    buttons: [],
  })

  const [actionMenu, setActionMenu] = useState<FileManagerActionMenuState>({
    visible: false,
    item: null,
  })

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createType, setCreateType] = useState<"folder" | "file">("folder")
  const [newItemName, setNewItemName] = useState("")
  const [renameModal, setRenameModal] = useState<{ item: FileInfo; draft: string } | null>(null)
  const [moveModal, setMoveModal] = useState<{ item: FileInfo; destinationDir: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skipInitialFocusReload = useRef(true)

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setAlertConfig({
        visible: true,
        title,
        message,
        buttons: buttons ?? [{ text: t("common:ok") }],
      })
    },
    [t],
  )

  const loadDirectory = useCallback(
    async (dirPath: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fileManagerListDirectory(dirPath)
        setItems(result.items)
        setError(null)
      } catch (err: unknown) {
        const message =
          err instanceof RestApiError
            ? err.formatForUser()
            : err instanceof Error
              ? err.message
              : t("fileManager:listFailed")
        setError(message)
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  useEffect(() => {
    void loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  useFocusEffect(
    useCallback(() => {
      if (skipInitialFocusReload.current) {
        skipInitialFocusReload.current = false
        return
      }
      void loadDirectory(currentPathRef.current)
    }, [loadDirectory]),
  )

  const handleRefresh = useCallback(() => {
    void loadDirectory(currentPathRef.current)
  }, [loadDirectory])

  const handleNavigate = useCallback(
    (item: FileInfo) => {
      if (item.type === "directory") {
        setCurrentPath(item.path)
      } else {
        navigation.navigate("FileEditor", {
          filePath: item.path,
          fileName: item.name,
        })
      }
    },
    [navigation],
  )

  const handleLongPress = useCallback((item: FileInfo) => {
    setActionMenu({ visible: true, item })
  }, [])

  const handleDelete = useCallback(
    (item: FileInfo) => {
      showAlert(
        t("fileManager:deleteConfirm", { name: item.name }),
        t("fileManager:deleteWarning"),
        [
          { text: t("common:cancel"), style: "cancel" },
          {
            text: t("common:delete"),
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  const message = await fileManagerDeletePath(item.path)
                  await loadDirectory(currentPathRef.current)
                  showAlert(t("common:success"), message || t("fileManager:deleted"))
                } catch (err: unknown) {
                  const msg =
                    err instanceof RestApiError
                      ? err.formatForUser()
                      : err instanceof Error
                        ? err.message
                        : t("fileManager:deleteFailed")
                  showAlert(t("common:error"), msg)
                }
              })()
            },
          },
        ],
      )
    },
    [loadDirectory, showAlert, t],
  )

  const closeActionMenu = useCallback(() => {
    setActionMenu({ visible: false, item: null })
  }, [])

  const handleActionMenuRename = useCallback(() => {
    const item = actionMenu.item
    closeActionMenu()
    if (item) setRenameModal({ item, draft: item.name })
  }, [actionMenu.item, closeActionMenu])

  const handleActionMenuMove = useCallback(() => {
    const item = actionMenu.item
    closeActionMenu()
    if (item) setMoveModal({ item, destinationDir: "" })
  }, [actionMenu.item, closeActionMenu])

  const handleActionMenuDelete = useCallback(() => {
    const item = actionMenu.item
    closeActionMenu()
    if (item) handleDelete(item)
  }, [actionMenu.item, closeActionMenu, handleDelete])

  const handleActionMenuDownload = useCallback(() => {
    const item = actionMenu.item
    closeActionMenu()
    if (!item || item.type === "directory") return

    void (async () => {
      try {
        const token = await fileManagerGenerateDownloadToken(item.path)
        const baseUrl = getBackendBaseUrl()
        const downloadUrl = `${baseUrl}/api/download?token=${encodeURIComponent(token)}`

        const tg = getTelegramWebApp()
        if (tg && typeof tg.downloadFile === "function") {
          tg.downloadFile({ url: downloadUrl, file_name: item.name })
        } else {
          // Fallback for non-Telegram or older Telegram versions
          window.open(downloadUrl, "_blank")
        }
      } catch (err: unknown) {
        const msg =
          err instanceof RestApiError
            ? err.formatForUser()
            : err instanceof Error
              ? err.message
              : t("fileManager:downloadFailed")
        showAlert(t("common:error"), msg)
      }
    })()
  }, [actionMenu.item, closeActionMenu, showAlert, t])

  const handleCreate = useCallback((type: "folder" | "file") => {
    setCreateType(type)
    setNewItemName("")
    setCreateModalVisible(true)
  }, [])

  const handleCreateConfirm = useCallback(async () => {
    const name = newItemName.trim()
    if (!name) return

    const base = currentPathRef.current
    const newPath = `${base}/${name}`

    try {
      if (createType === "folder") {
        await postJsonApi("/api/files/create-folder", { path: newPath })
      } else {
        await postJsonApi("/api/files/write", { path: newPath, content: "" })
      }

      setCreateModalVisible(false)
      handleRefresh()
    } catch (err: unknown) {
      const typeNoun = t(
        createType === "folder" ? "fileManager:typeNounFolder" : "fileManager:typeNounFile",
      )
      const message =
        err instanceof Error ? err.message : t("fileManager:createFailed", { type: typeNoun })
      showAlert(t("common:error"), message)
    }
  }, [createType, newItemName, handleRefresh, showAlert, t])

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("targetDir", currentPathRef.current)
        formData.append("file", file, file.name)

        await postMultipartApi("/api/files/upload", formData)

        handleRefresh()
        showAlert(t("common:success"), t("fileManager:uploadSuccess", { name: file.name }))
      } catch (err: unknown) {
        const message =
          err instanceof RestApiError
            ? err.formatForUser()
            : err instanceof Error
              ? err.message
              : t("fileManager:uploadFailed")
        showAlert(t("fileManager:uploadErrorTitle"), message)
      } finally {
        setUploading(false)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [handleRefresh, showAlert, t],
  )

  const handleGoUp = useCallback(() => {
    const path = currentPathRef.current
    const parent = path.substring(0, path.lastIndexOf("/"))
    if (parent) {
      setCurrentPath(parent)
    }
  }, [])

  const handleQuickAccess = useCallback((pathObj: QuickAccessPath) => {
    setCurrentPath(pathObj.path)
  }, [])

  const dismissAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }))
  }, [])

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false)
  }, [])

  const closeRenameModal = useCallback(() => {
    setRenameModal(null)
  }, [])

  const closeMoveModal = useCallback(() => {
    setMoveModal(null)
  }, [])

  const setRenameDraft = useCallback((text: string) => {
    setRenameModal((prev) => (prev ? { ...prev, draft: text } : null))
  }, [])

  const setMoveDestinationDir = useCallback((text: string) => {
    setMoveModal((prev) => (prev ? { ...prev, destinationDir: text } : null))
  }, [])

  const handleRenameConfirm = useCallback(async () => {
    if (!renameModal) return
    const name = renameModal.draft.trim()
    if (!name) return

    try {
      await fileManagerRenamePath(renameModal.item.path, name)
      setRenameModal(null)
      handleRefresh()
      showAlert(t("common:success"), t("fileManager:renamed"))
    } catch (err: unknown) {
      const msg =
        err instanceof RestApiError
          ? err.formatForUser()
          : err instanceof Error
            ? err.message
            : t("fileManager:renameFailed")
      showAlert(t("common:error"), msg)
    }
  }, [renameModal, handleRefresh, showAlert, t])

  const handleMoveConfirm = useCallback(async () => {
    if (!moveModal) return
    const dir = moveModal.destinationDir.trim()
    if (!dir) return

    try {
      await fileManagerMovePath(moveModal.item.path, dir)
      setMoveModal(null)
      handleRefresh()
      showAlert(t("common:success"), t("fileManager:moved"))
    } catch (err: unknown) {
      const msg =
        err instanceof RestApiError
          ? err.formatForUser()
          : err instanceof Error
            ? err.message
            : t("fileManager:moveFailed")
      showAlert(t("common:error"), msg)
    }
  }, [moveModal, handleRefresh, showAlert, t])

  return {
    currentPath,
    items,
    loading,
    uploading,
    quickAccessPaths,
    error,
    alertConfig,
    dismissAlert,
    actionMenu,
    closeActionMenu,
    handleActionMenuRename,
    handleActionMenuMove,
    handleActionMenuDelete,
    handleActionMenuDownload,
    renameModal,
    moveModal,
    setRenameDraft,
    setMoveDestinationDir,
    closeRenameModal,
    closeMoveModal,
    handleRenameConfirm,
    handleMoveConfirm,
    createModalVisible,
    createType,
    newItemName,
    setNewItemName,
    fileInputRef,
    handleRefresh,
    handleNavigate,
    handleLongPress,
    handleDelete,
    handleCreate,
    handleCreateConfirm,
    handleUpload,
    handleFileChange,
    handleGoUp,
    handleQuickAccess,
    closeCreateModal,
  }
}
