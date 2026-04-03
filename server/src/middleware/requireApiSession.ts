import type { Request, Response, NextFunction } from "express"

import type { AuthSession } from "../auth/sessions.js"
import { getValidSession } from "../auth/sessions.js"

export type PiAuthenticatedRequest = Request & { piSession: AuthSession }

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith("Bearer ")) return null
  const t = authorization.slice(7).trim()
  return t.length > 0 ? t : null
}

/**
 * Requires `Authorization: Bearer <sessionToken>` (same token as Socket.IO `auth:success`).
 */
export function requireApiSession(req: Request, res: Response, next: NextFunction) {
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
