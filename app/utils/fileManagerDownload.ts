import { socketManager } from "@/services/socket/SocketManager"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

async function readDownloadErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const j = JSON.parse(text) as { error?: string }
    return j.error || text || `HTTP ${res.status}`
  } catch {
    return text.trim() || `HTTP ${res.status}`
  }
}

/**
 * Download from Pi `GET /api/files/download` with session token.
 * Web-only: triggers a browser file save (blob + temporary `<a download>`).
 */
export async function downloadFileFromPiServer(filePath: string, displayName: string): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Download is only supported in the browser")
  }

  const base = getBackendBaseUrl().replace(/\/$/, "")
  const token = socketManager.getSessionToken()
  const url = `${base}/api/files/download?path=${encodeURIComponent(filePath)}`
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(await readDownloadErrorMessage(res))
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = displayName.replace(/[/\\]/g, "_")
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
