import type { AlertButton } from "@/components/AlertModal"
import type { FileInfo } from "../../../shared/types/file-manager"

export interface FileManagerAlertState {
  visible: boolean
  title: string
  message?: string
  buttons: AlertButton[]
}

export interface FileManagerActionMenuState {
  visible: boolean
  item: FileInfo | null
}
