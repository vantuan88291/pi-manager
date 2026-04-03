import { Server, Socket } from "socket.io"
import { validateTelegramInitData } from "../auth/telegram.js"
import { whitelist } from "../auth/whitelist.js"
import { createSessionToken, getValidSession, saveSession } from "../auth/sessions.js"
import { systemModule } from "./modules/system.js"
import { wifiModule } from "./modules/wifi.js"
import { bluetoothModule } from "./modules/bluetooth.js"
import { audioModule } from "./modules/audio.js"
import { storageModule } from "./modules/storage.js"
import { cronjobModule } from "./modules/cronjob.js"

import type { ServerSocketModule } from "./types.js"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""

const modules: ServerSocketModule[] = [
  systemModule,
  wifiModule,
  bluetoothModule,
  audioModule,
  storageModule,
  cronjobModule,
]

export function setupSocketServer(io: Server) {
  // --- Auth middleware ---
  io.use(async (socket, next) => {
    const { sessionToken, initData } = socket.handshake.auth ?? {}

    // Path A: reconnect with session token
    if (sessionToken) {
      const session = getValidSession(sessionToken)
      if (session) {
        socket.data.user = session.user
        socket.data.sessionToken = sessionToken
        return next()
      }
      return next(new Error("SESSION_EXPIRED"))
    }

    // Path B: first connect with Telegram initData
    if (initData) {
      const user = validateTelegramInitData(initData, BOT_TOKEN)
      if (!user) return next(new Error("AUTH_INVALID"))

      if (!whitelist.isAllowed(user.id)) return next(new Error("ACCESS_DENIED"))

      const token = createSessionToken()
      saveSession(token, { user, createdAt: Date.now() })
      socket.data.user = user
      socket.data.sessionToken = token
      return next()
    }

    // Path C: No initData and no sessionToken = Dev mode (browser testing)
    const isDebug = process.env.DEBUG === "true"
    if (isDebug) {
      console.log("[socket] DEBUG mode: allowing browser connection without auth")
      const devUser = { id: 0, firstName: "Developer", username: "dev" }
      const token = createSessionToken()
      saveSession(token, { user: devUser, createdAt: Date.now() })
      socket.data.user = devUser
      socket.data.sessionToken = token
      return next()
    }

    console.log("[socket] connection rejected: no auth provided")
    return next(new Error("AUTH_REQUIRED"))
  })

  // --- Connection handler ---
  io.on("connection", (socket: Socket) => {
    const { user, sessionToken } = socket.data
    console.log(`[socket] connected: ${user.firstName} (${user.id})`)

    socket.emit("auth:success", { user, sessionToken })

    modules.forEach((mod) => mod.register(socket, io))

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
