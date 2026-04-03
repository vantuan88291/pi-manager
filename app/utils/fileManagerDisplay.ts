import i18n from "i18next"

import { translate } from "@/i18n/translate"

import type { FileInfo } from "../../shared/types/file-manager"

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function formatModifiedTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const locale = i18n.isInitialized ? i18n.language : undefined
  const locales = locale ? [locale] : undefined

  if (days === 0) {
    return date.toLocaleTimeString(locales, { hour: "2-digit", minute: "2-digit" })
  }
  if (days === 1) {
    return translate("fileManager:modifiedYesterday")
  }
  if (days < 7) {
    return translate("fileManager:modifiedDaysAgo", { count: days })
  }
  return date.toLocaleDateString(locales)
}

export function getFileIcon(file: FileInfo): {
  font: "Ionicons" | "MaterialCommunityIcons"
  name: string
  color: string
} {
  if (file.type === "directory") {
    return { font: "Ionicons", name: "folder", color: "#F59E0B" }
  }

  const ext = file.extension?.toLowerCase()
  if (["js", "ts", "tsx", "jsx"].includes(ext || "")) {
    return { font: "Ionicons", name: "code-slash", color: "#6366F1" }
  }
  if (["json", "yml", "yaml", "xml"].includes(ext || "")) {
    return { font: "Ionicons", name: "document-text", color: "#10B981" }
  }
  if (["md", "txt"].includes(ext || "")) {
    return { font: "Ionicons", name: "document-outline", color: "#3B82F6" }
  }
  if (["log"].includes(ext || "")) {
    return { font: "Ionicons", name: "bug", color: "#EF4444" }
  }
  if (["sh", "py", "env"].includes(ext || "")) {
    return { font: "Ionicons", name: "terminal", color: "#8B5CF6" }
  }

  return { font: "Ionicons", name: "document-outline", color: "#6B7280" }
}
