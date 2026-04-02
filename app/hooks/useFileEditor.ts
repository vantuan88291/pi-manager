import { useState, useEffect, useCallback } from 'react'
import type { FileReadResponse } from '@/shared/types/file-manager'

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
  handleSave: () => Promise<void>
  handleBack: (onDiscard: () => void) => void
  setContent: (content: string) => void
}

/**
 * Custom hook for file editor logic
 * Handles file read/write operations via REST API
 * Manages unsaved changes state
 */
export function useFileEditor({ filePath, fileName }: UseFileEditorParams): UseFileEditorReturn {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load file content on mount
  useEffect(() => {
    let isMounted = true

    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
        const result: FileReadResponse = await response.json()

        if (!isMounted) return

        if (result.success && result.data) {
          setContent(result.data.content)
          setOriginalContent(result.data.content)
        } else {
          setError(result.error || 'Failed to read file')
        }
      } catch (err: any) {
        if (!isMounted) return
        setError(err.message || 'Network error')
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
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOriginalContent(content)
      } else {
        setError(result.error || 'Failed to save file')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSaving(false)
    }
  }, [filePath, content])

  // Handle back navigation with unsaved changes check
  const handleBack = useCallback(
    (onDiscard: () => void) => {
      if (hasChanges) {
        // Show confirmation dialog (handled by parent component)
        onDiscard()
      } else {
        onDiscard()
      }
    },
    [hasChanges]
  )

  return {
    content,
    originalContent,
    loading,
    saving,
    error,
    hasChanges,
    handleSave,
    handleBack,
    setContent,
  }
}
