import crypto from "node:crypto"

/** Same TTL as Socket.IO session (24h). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export interface SessionUser {
  id: number
  firstName: string
  username?: string
}

export interface AuthSession {
  user: SessionUser
  createdAt: number
}

const sessions = new Map<string, AuthSession>()

setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token)
  }
}, 10 * 60 * 1000)

export function getValidSession(token: string | undefined | null): AuthSession | null {
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token)
    return null
  }
  return session
}

export function saveSession(token: string, session: AuthSession): void {
  sessions.set(token, session)
}

export function createSessionToken(): string {
  return crypto.randomUUID()
}
