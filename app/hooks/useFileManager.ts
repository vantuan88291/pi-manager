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
import { useSocket } from "@/services/socket/SocketContext"
import { fileManagerClientModule } from "@/services/socket/modules/file-manager"
import type { FileInfo, QuickAccessPath } from "../../shared/types/file-manager"
import { QUICK_ACCESS_PATHS } from "../../shared/types/file-manager"

const DEFAULT_HOME_PATH = "/home/vantuan88291"

export function useFileManager() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
  const { t } = useTranslation()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()

  const [currentPath, setCurrentPath] = useState(DEFAULT_HOME_PATH)
  const currentPathRef = useRef(currentPath)
  currentPathRef.current = currentPath

  const [items, setItems] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    subscribeToModule("file-manager")

    const unsubList = fileManagerClientModule.onList((result) => {
      if (result.error) {
        setError(result.error)
      } else {
        setItems(result.items || [])
        setError(null)
      }
      setLoading(false)
    })

    const unsubDelete = fileManagerClientModule.onDelete((result) => {
      if (result.success) {
        fileManagerClientModule.listDirectory(currentPathRef.current)
        showAlert(t("common:success"), result.message || t("fileManager:deleted"))
      } else {
        showAlert(t("common:error"), result.error || t("fileManager:deleteFailed"))
      }
    })

    fileManagerClientModule.requestQuickAccess()
    fileManagerClientModule.listDirectory(currentPathRef.current)

    return () => {
      unsubList()
      unsubDelete()
      unsubscribeFromModule("file-manager")
    }
  }, [subscribeToModule, unsubscribeFromModule, currentPath, showAlert, t])

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        fileManagerClientModule.listDirectory(currentPathRef.current)
      }
    }, [loading, currentPath]),
  )

  const handleRefresh = useCallback(() => {
    fileManagerClientModule.listDirectory(currentPathRef.current)
  }, [])

  const handleNavigate = useCallback(
    (item: FileInfo) => {
      if (item.type === "directory") {
        setCurrentPath(item.path)
        setLoading(true)
        fileManagerClientModule.listDirectory(item.path)
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
              fileManagerClientModule.deleteFileOrFolder(item.path)
            },
          },
        ],
      )
    },
    [showAlert, t],
  )

  const closeActionMenu = useCallback(() => {
    setActionMenu({ visible: false, item: null })
  }, [])

  const handleActionMenuDelete = useCallback(() => {
    const item = actionMenu.item
    closeActionMenu()
    if (item) handleDelete(item)
  }, [actionMenu.item, closeActionMenu, handleDelete])

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
        await fetch("/api/files/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: newPath }),
        })
      } else {
        await fetch("/api/files/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: newPath, content: "" }),
        })
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

      try {
        const content = await file.text()
        const newPath = `${currentPathRef.current}/${file.name}`
        await fetch("/api/files/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: newPath, content }),
        })

        handleRefresh()
        showAlert(t("common:success"), t("fileManager:uploadSuccess", { name: file.name }))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("fileManager:uploadFailed")
        showAlert(t("common:error"), message)
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
      setLoading(true)
      fileManagerClientModule.listDirectory(parent)
    }
  }, [])

  const handleQuickAccess = useCallback((pathObj: QuickAccessPath) => {
    setCurrentPath(pathObj.path)
    setLoading(true)
    fileManagerClientModule.listDirectory(pathObj.path)
  }, [])

  const dismissAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }))
  }, [])

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false)
  }, [])

  return {
    currentPath,
    items,
    loading,
    quickAccessPaths,
    error,
    alertConfig,
    dismissAlert,
    actionMenu,
    closeActionMenu,
    handleActionMenuDelete,
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
