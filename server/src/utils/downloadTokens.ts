import crypto from 'node:crypto'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

interface DownloadTokenData {
  filePath: string
  expiresAt: number
}

const tokenStore = new Map<string, DownloadTokenData>()

// Cleanup expired tokens every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) tokenStore.delete(token)
  }
}, 5 * 60 * 1000)

// Allow Node.js to exit even if this interval is active
cleanupInterval.unref()

/**
 * Creates a one-time, time-limited download token for the given file path.
 * The token expires after 15 minutes and is deleted on first use.
 */
export function createDownloadToken(filePath: string): string {
  const token = crypto.randomUUID()
  tokenStore.set(token, { filePath, expiresAt: Date.now() + TOKEN_TTL_MS })
  return token
}

/**
 * Validates and consumes a download token (one-time use).
 * Returns the file path if valid, or null if invalid/expired.
 */
export function consumeDownloadToken(token: string): string | null {
  const data = tokenStore.get(token)
  if (!data) return null
  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token)
    return null
  }
  tokenStore.delete(token) // one-time use
  return data.filePath
}
