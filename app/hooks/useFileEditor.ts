import { useState, useEffect, useCallback, useMemo } from "react"

import { getJsonApi, postJsonApi, RestApiError } from "@/services/api"

interface UseFileEditorParams {
  filePath: string
  fileName: string
}

interface UseFileEditorReturn {
  content: string
  originalContent: string
  loading: boolean
  saving: boolean
  error: string | null
  hasChanges: boolean
  isMediaFile: boolean
  mediaType: "image" | "video" | "audio" | null
  language: string
  handleSave: () => Promise<void>
  handleBack: (onDiscard: () => void) => void
  setContent: (content: string) => void
  setShowDiscardModal: (show: boolean) => void
  showDiscardModal: boolean
}

// Media file extensions that should be previewed, not edited
const MEDIA_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
  "mp4",
  "webm",
  "avi",
  "mov",
  "mp3",
  "wav",
  "ogg",
  "flac",
]

/**
 * Check if file is a media file based on extension
 */
function isMediaFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? MEDIA_EXTENSIONS.includes(ext) : false
}

/**
 * Get media type for preview
 */
function getMediaType(filename: string): "image" | "video" | "audio" | null {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (!ext) return null

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"].includes(ext)) {
    return "image"
  }
  if (["mp4", "webm", "avi", "mov"].includes(ext)) {
    return "video"
  }
  if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
    return "audio"
  }
  return null
}

/**
 * Get language from file extension for syntax highlighting
 */
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    scss: "scss",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    py: "python",
    sh: "shell",
    bash: "shell",
    env: "shell",
    log: "text",
    txt: "text",
  }
  return languageMap[ext || ""] || "text"
}

/**
 * Custom hook for file editor logic
 * Handles file read/write operations via REST API
 * Manages unsaved changes state
 * Detects media files for preview mode
 */
export function useFileEditor({ filePath, fileName }: UseFileEditorParams): UseFileEditorReturn {
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscardModal, setShowDiscardModal] = useState(false)

  // Check if file is media
  const fileIsMedia = useMemo(() => isMediaFile(fileName), [fileName])
  const mediaType = useMemo(() => getMediaType(fileName), [fileName])
  const language = useMemo(() => getLanguageFromExtension(fileName), [fileName])

  // Load file content on mount
  useEffect(() => {
    let isMounted = true

    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await getJsonApi<{
          success: boolean
          data?: { content: string }
          error?: string
        }>(`/api/files/read?path=${encodeURIComponent(filePath)}`)

        if (!isMounted) return

        if (result.data?.content !== undefined) {
          setContent(result.data.content)
          setOriginalContent(result.data.content)
        } else {
          setError("Failed to read file")
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setError(
          err instanceof RestApiError
            ? err.formatForUser()
            : err instanceof Error
              ? err.message
              : "Network error",
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      isMounted = false
    }
  }, [filePath])

  // Check if content has changed
  const hasChanges = content !== originalContent

  // Save file content
  const handleSave = useCallback(async () => {
    setSaving(true)

    try {
      await postJsonApi("/api/files/write", { path: filePath, content })
      setOriginalContent(content)
    } catch (err: unknown) {
      setError(
        err instanceof RestApiError
          ? err.formatForUser()
          : err instanceof Error
            ? err.message
            : "Network error",
      )
    } finally {
      setSaving(false)
    }
  }, [filePath, content])

  // Handle back navigation with unsaved changes check
  const handleBack = useCallback(
    (onDiscard: () => void) => {
      if (hasChanges) {
        setShowDiscardModal(true)
      } else {
        onDiscard()
      }
    },
    [hasChanges],
  )

  return {
    content,
    originalContent,
    loading,
    saving,
    error,
    hasChanges,
    isMediaFile: fileIsMedia,
    mediaType,
    language,
    handleSave,
    handleBack,
    setContent,
    setShowDiscardModal,
    showDiscardModal,
  }
}
