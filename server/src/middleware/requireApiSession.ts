import type { Request, Response, NextFunction } from "express"

import { verifyFileDownloadSignature } from "../auth/fileDownloadSignature.js"
import type { AuthSession } from "../auth/sessions.js"
import { getValidSession } from "../auth/sessions.js"

export type PiAuthenticatedRequest = Request & { piSession: AuthSession }

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith("Bearer ")) return null
  const t = authorization.slice(7).trim()
  return t.length > 0 ? t : null
}

function isSignedFileDownloadGet(req: Request): boolean {
  if (req.method !== "GET") return false
  const base = req.originalUrl.split("?")[0]
  if (base !== "/api/files/download") return false
  const p = req.query.path
  const expQ = req.query.exp
  const sig = req.query.sig
  if (typeof p !== "string" || expQ === undefined || typeof sig !== "string") return false
  const expSec = typeof expQ === "string" ? parseInt(expQ, 10) : Number(expQ)
  if (!Number.isFinite(expSec)) return false
  return verifyFileDownloadSignature(p, expSec, sig)
}

/**
 * Requires `Authorization: Bearer <sessionToken>` (same token as Socket.IO `auth:success`).
 * GET `/api/files/download` with valid `path` + `exp` + `sig` is allowed without Bearer
 * (for Telegram Mini App `WebApp.downloadFile`, which fetches the URL without your headers).
 */
export function requireApiSession(req: Request, res: Response, next: NextFunction) {
  if (isSignedFileDownloadGet(req)) {
    return next()
  }

  const token = extractBearerToken(req.headers.authorization)
  const session = getValidSession(token)
  if (!session) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized — valid session required (sign in via the app)",
    })
  }
  ;(req as PiAuthenticatedRequest).piSession = session
  next()
}
