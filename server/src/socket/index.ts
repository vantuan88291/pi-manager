import crypto from "node:crypto"
import { Server, Socket } from "socket.io"
import { validateTelegramInitData } from "../auth/telegram.js"
import { whitelist } from "../auth/whitelist.js"
import { systemModule } from "./modules/system.js"

import type { ServerSocketModule } from "./types.js"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface Session {
  user: { id: number; firstName: string; username?: string }
  createdAt: number
}

const sessions = new Map<string, Session>()

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token)
  }
}, 10 * 60 * 1000)

const modules: ServerSocketModule[] = [
  systemModule,
  // wifiModule, bluetoothModule, audioModule, cameraModule - Phase 2+
]

export function setupSocketServer(io: Server) {
  // --- Auth middleware ---
  io.use(async (socket, next) => {
    const { sessionToken, initData } = socket.handshake.auth ?? {}

    // Path A: reconnect with session token
    if (sessionToken) {
      const session = sessions.get(sessionToken)
      if (session && Date.now() - session.createdAt < SESSION_TTL_MS) {
        socket.data.user = session.user
        socket.data.sessionToken = sessionToken
        return next()
      }
      return next(new Error("SESSION_EXPIRED"))
    }

    // Path B: first connect with Telegram initData (or dev mode)
    const user = validateTelegramInitData(initData ?? "", BOT_TOKEN)
    if (!user) return next(new Error("AUTH_INVALID"))

    if (!whitelist.isAllowed(user.id)) return next(new Error("ACCESS_DENIED"))

    const token = crypto.randomUUID()
    sessions.set(token, { user, createdAt: Date.now() })
    socket.data.user = user
    socket.data.sessionToken = token
    next()
  })

  // --- Connection handler ---
  io.on("connection", (socket: Socket) => {
    const { user, sessionToken } = socket.data
    console.log(`[socket] connected: ${user.firstName} (${user.id})`)

    // Send auth success with session token
    socket.emit("auth:success", { user, sessionToken })

    // Register all modules
    modules.forEach((mod) => mod.register(socket, io))

    // Generic subscribe / unsubscribe routing
    socket.on("module:subscribe", ({ module: name }: { module: string }) => {
      const mod = modules.find((m) => m.name === name)
      if (mod) {
        mod.onSubscribe(socket)
      } else {
        socket.emit("error", {
          module: name,
          code: "MODULE_NOT_FOUND",
          message: `Unknown module: ${name}`,
        })
      }
    })

    socket.on("module:unsubscribe", ({ module: name }: { module: string }) => {
      modules.find((m) => m.name === name)?.onUnsubscribe(socket)
    })

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${user.firstName} (${reason})`)
      modules.forEach((mod) => mod.onUnsubscribe(socket))
    })
  })
}
