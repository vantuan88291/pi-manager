import { postJsonApi } from "@/services/api"
import { getTelegramWebApp, isTelegramMiniApp } from "@/services/telegram"
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

type DownloadUrlPayload = {
  success: true
  path: string
  exp: number
  sig: string
}

/**
 * In Telegram Mini App, blob + `<a download>` opens inline in the WebView.
 * Use `WebApp.downloadFile({ url, file_name })` (Bot API 8.0+) with a short-lived signed HTTPS URL.
 */
export async function downloadFileFromPiServer(filePath: string, displayName: string): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Download is only supported in the browser")
  }

  const base = getBackendBaseUrl().replace(/\/$/, "")
  const safeName = displayName.replace(/[/\\]/g, "_")

  const tg = getTelegramWebApp()
  if (isTelegramMiniApp() && tg) {
    const token = socketManager.getSessionToken()
    if (!token) {
      throw new Error("Not signed in")
    }

    const data = await postJsonApi<DownloadUrlPayload>("/api/files/download-url", {
      path: filePath,
    })

    const params = new URLSearchParams({
      path: data.path,
      exp: String(data.exp),
      sig: data.sig,
    })
    const signedUrl = `${base}/api/files/download?${params.toString()}`

    if (typeof tg.downloadFile === "function") {
      tg.downloadFile({ url: signedUrl, file_name: safeName })
      return
    }

    if (typeof tg.openLink === "function") {
      tg.openLink(signedUrl)
      return
    }
  }

  const url = `${base}/api/files/download?path=${encodeURIComponent(filePath)}`
  const headers: Record<string, string> = {}
  const token = socketManager.getSessionToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(await readDownloadErrorMessage(res))
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
