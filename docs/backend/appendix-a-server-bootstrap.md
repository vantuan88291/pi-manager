# Appendix A: Server Bootstrap (copy-paste ready)

> Split backend docs (Appendix A).

## A.1 server/package.json

```json
{
  "name": "pi-manager-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "socket.io": "^4.8.1",
    "systeminformation": "^5.23.8",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.12.0",
    "eslint": "^8.57.0",
    "tsx": "^4.20.3",
    "typescript": "~5.9.2"
  }
}
```

## A.2 server/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## A.3 server/src/index.ts (full entry point)

```typescript
import "dotenv/config"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import express from "express"
import { Server } from "socket.io"
import { setupSocketServer } from "./socket/index.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT) || 3001
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8081")
  .split(",")
  .map((s) => s.trim())

const app = express()
app.use(cors({ origin: ALLOWED_ORIGINS }))

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

// Production: serve static frontend build from server/public/
const publicDir = path.join(__dirname, "../public")
app.use(express.static(publicDir))
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  transports: ["websocket"],
  pingInterval: 25_000,
  pingTimeout: 20_000
})

setupSocketServer(io)

server.listen(PORT, () => {
  console.log(`[pi-manager] server listening on http://localhost:${PORT}`)
  console.log(`[pi-manager] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`)
})
```

## A.4 server/src/socket/index.ts (socket bootstrap + auth middleware)

```typescript
import crypto from "node:crypto"
import { Server, Socket } from "socket.io"
import { validateTelegramInitData } from "../auth/telegram.js"
import { whitelist } from "../auth/whitelist.js"
import { systemModule } from "./modules/system.js"
// import { wifiModule } from "./modules/wifi.js"         // Phase 2
// import { bluetoothModule } from "./modules/bluetooth.js"
// import { audioModule } from "./modules/audio.js"
// import { cameraModule } from "./modules/camera.js"     // Phase 3

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
  systemModule
  // wifiModule,         // uncomment as you implement
  // bluetoothModule,
  // audioModule,
  // cameraModule,
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

    // Path B: first connect with Telegram initData
    if (!initData) return next(new Error("AUTH_REQUIRED"))

    const user = validateTelegramInitData(initData, BOT_TOKEN)
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
          message: `Unknown module: ${name}`
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
```

## A.5 server/src/socket/types.ts

```typescript
import { Server, Socket } from "socket.io"

export interface ServerSocketModule {
  name: string
  register(socket: Socket, io: Server): void
  onSubscribe(socket: Socket): void
  onUnsubscribe(socket: Socket): void
}
```

## A.6 server/src/auth/telegram.ts

```typescript
import crypto from "node:crypto"

interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param initData  Raw query string from Telegram.WebApp.initData
 * @param botToken  The bot's token from BotFather
 * @returns TelegramUser if valid, null if tampered/expired
 */
export function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return null

  params.delete("hash")
  params.sort() // alphabetical order required by Telegram

  const dataCheckString = Array.from(params.entries())
    .map(([key, val]) => `${key}=${val}`)
    .join("\n")

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()

  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (hash !== expectedHash) return null

  // Optionally check auth_date freshness (reject if > 1 hour old)
  const authDate = Number(params.get("auth_date") ?? 0)
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 3600) return null

  try {
    const userJson = params.get("user")
    if (!userJson) return null
    const raw = JSON.parse(userJson)
    return {
      id: raw.id,
      firstName: raw.first_name ?? "",
      lastName: raw.last_name,
      username: raw.username,
      photoUrl: raw.photo_url,
      languageCode: raw.language_code
    }
  } catch {
    return null
  }
}
```

## A.7 server/src/auth/whitelist.ts

```typescript
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WHITELIST_PATH = path.join(__dirname, "../config/whitelist.json")

class Whitelist {
  private allowed = new Set<number>()

  constructor() {
    this.load()
    this.watch()
  }

  load() {
    try {
      if (!fs.existsSync(WHITELIST_PATH)) {
        const adminId = Number(process.env.ADMIN_TELEGRAM_ID)
        const initial = adminId ? [adminId] : []
        fs.mkdirSync(path.dirname(WHITELIST_PATH), { recursive: true })
        fs.writeFileSync(WHITELIST_PATH, JSON.stringify(initial, null, 2))
        if (!adminId) {
          console.warn(
            "[whitelist] Empty whitelist created. Set ADMIN_TELEGRAM_ID in .env or edit whitelist.json."
          )
        }
      }
      const raw = JSON.parse(fs.readFileSync(WHITELIST_PATH, "utf-8"))
      this.allowed = new Set(Array.isArray(raw) ? raw : [])
      console.log(`[whitelist] loaded ${this.allowed.size} user(s)`)
    } catch (err) {
      console.error("[whitelist] failed to load:", err)
    }
  }

  private watch() {
    fs.watch(WHITELIST_PATH, () => {
      console.log("[whitelist] file changed, reloading...")
      this.load()
    })
  }

  isAllowed(userId: number): boolean {
    return this.allowed.has(userId)
  }
}

export const whitelist = new Whitelist()
```

