# Pi Manager — Backend & Socket Specification

> Part of Pi Manager spec. See also:
> - [OVERVIEW.md](./OVERVIEW.md) — architecture, structure, roadmap summary
> - [UI.md](./UI.md) — screens, components, styling, navigation
>
> This file contains: socket architecture, event contracts, safety, deployment, **data types**, tech stack, commands, env vars, quick start.

---

## 3. Socket Architecture (detailed)

> This is the most critical section. Socket communication is the backbone of the app.
> The design must support easy addition of new feature modules without touching core socket code.

### 3.1 Design Pattern — Module Registry

Both client and server follow the same pattern: a **central socket manager** that dynamically
registers **feature modules**. Each module encapsulates its own events, state, and cleanup logic.

```
┌───────────────────────────────────────────────────┐
│                  Socket Manager                    │
│  - connect / disconnect / reconnect lifecycle      │
│  - auth handshake                                  │
│  - module registry (Map<string, SocketModule>)     │
│  - error routing                                   │
└───────────┬───────────────────────┬───────────────┘
            │                       │
   ┌────────▼──────┐      ┌────────▼──────┐
   │ SystemModule   │      │ WifiModule     │   ... more modules
   │ - subscribe()  │      │ - scan()       │
   │ - unsubscribe()│      │ - connect()    │
   │ - onStats()    │      │ - onNetworks() │
   └───────────────┘      └───────────────┘
```

### 3.2 Connection Lifecycle

```
App Launch
    │
    ▼
[1] SocketProvider mounts → creates socket.io-client instance (autoConnect: false)
    │
    ▼
[2] Client sends Telegram initData to server (once) via socket handshake auth
    │   └─ socket.auth = { initData: rawInitData }
    │   └─ socket.connect()
    │
    ▼
[3] Server middleware validates HMAC → checks user ID against whitelist
    │   └─ if HMAC invalid: reject → client receives connect_error "AUTH_INVALID"
    │   └─ if user ID not in whitelist: reject → client receives connect_error "ACCESS_DENIED"
    │   └─ if both pass: middleware calls next() → connection established
    │
    ▼
[4] Connection established → server emits "auth:success" with { user, sessionToken }
    │   └─ client stores sessionToken in memory (not persisted to disk)
    │   └─ client sets isAuthenticated = true → SocketProvider renders main app
    │   On connect_error "ACCESS_DENIED" → shows AccessDeniedScreen
    │
    ▼
[5] Each screen mounts → its feature hook calls module.subscribe()
    │   └─ e.g. DashboardScreen → useSystemStats() → systemModule.subscribe()
    │   └─ server starts polling system data, emits "system:stats" every 2s
    │
    ▼
[6] Screen unmounts → module.unsubscribe()
    │   └─ server stops polling for that module (if no other subscribers)
    │
    ▼
[7] App backgrounds or network drops → socket disconnects
    │   └─ on reconnect: client sends sessionToken (not initData) via socket.auth
    │   └─ server validates sessionToken from memory → restores session
    │   └─ if sessionToken expired/invalid → client falls back to initData auth
    │
    ▼
[8] App closes / user navigates away → SocketProvider unmounts → socket.disconnect()
```

### 3.3 Reconnection Strategy

```typescript
// Client socket configuration
const socket = io(SOCKET_URL, {
  autoConnect: false,                    // manual connect after auth
  reconnection: true,
  reconnectionAttempts: Infinity,        // never give up
  reconnectionDelay: 1000,              // start at 1s
  reconnectionDelayMax: 30000,          // cap at 30s
  timeout: 10000,                       // connection timeout
  transports: ["websocket"],            // skip polling, go straight to WS
})
```

**Connection states exposed to UI:**

| State | Meaning | UI Indicator |
|-------|---------|--------------|
| `connecting` | Initial connection or reconnecting | Pulsing dot (amber) |
| `connected` | Socket open + authenticated | Solid dot (green) |
| `disconnected` | Lost connection, will retry | Solid dot (red) + "Reconnecting..." banner |
| `error` | Auth failed or fatal error | Error screen with retry button |

**Re-authentication on reconnect:**
On reconnect, the client sets `socket.auth = { sessionToken }` (not initData).
The server checks the token against its in-memory session map.
If valid → connection restored instantly without re-validating Telegram HMAC.
If expired (e.g. server restarted, token TTL exceeded) → server rejects, client
falls back to full initData auth. This avoids sending raw initData on every reconnect.

### 3.4 Module Interface

Every socket module — both client-side and server-side — implements a standard interface.
This ensures consistent patterns and makes it trivial to add new features.

#### Client-side module interface

```typescript
// app/services/socket/types.ts

import { Socket } from "socket.io-client"

interface SocketModule {
  /** Unique module name, e.g. "system", "wifi", "bluetooth" */
  name: string

  /**
   * Called once when the socket connects (or reconnects).
   * Register all event listeners here.
   */
  register(socket: Socket): void

  /**
   * Called when the socket disconnects.
   * Clean up any timers or local state.
   */
  cleanup(): void

  /**
   * Called when a screen that uses this module mounts.
   * Tells the server to start sending data for this module.
   */
  subscribe(): void

  /**
   * Called when a screen that uses this module unmounts.
   * Tells the server to stop sending data for this module.
   */
  unsubscribe(): void
}
```

#### Server-side module interface

```typescript
// server/src/socket/types.ts

import { Socket, Server } from "socket.io"

interface ServerSocketModule {
  name: string

  /**
   * Called once per client connection.
   * Register event handlers for this client's socket.
   */
  register(socket: Socket, io: Server): void

  /**
   * Called when a client subscribes to this module.
   * Start polling / streaming data to this socket.
   */
  onSubscribe(socket: Socket): void

  /**
   * Called when a client unsubscribes or disconnects.
   * Stop polling / streaming for this socket.
   */
  onUnsubscribe(socket: Socket): void
}
```

### 3.5 Module Registration Flow

#### Server startup

```typescript
// server/src/socket/index.ts — pseudocode

import { Server } from "socket.io"
import { systemModule } from "./modules/system"
import { wifiModule } from "./modules/wifi"
// ...import more modules

const modules: ServerSocketModule[] = [
  systemModule,
  wifiModule,
  // ...add new modules here — that's it
]

io.on("connection", (socket) => {
  // Auth middleware already validated the token (see 3.6)

  // Register all modules for this client
  modules.forEach((mod) => mod.register(socket, io))

  // Generic subscribe/unsubscribe routing
  socket.on("module:subscribe", ({ module }) => {
    const mod = modules.find((m) => m.name === module)
    mod?.onSubscribe(socket)
  })

  socket.on("module:unsubscribe", ({ module }) => {
    const mod = modules.find((m) => m.name === module)
    mod?.onUnsubscribe(socket)
  })

  socket.on("disconnect", () => {
    modules.forEach((mod) => mod.onUnsubscribe(socket))
  })
})
```

#### Client startup

```typescript
// app/services/socket/SocketManager.ts — pseudocode

class SocketManager {
  private socket: Socket
  private modules: Map<string, SocketModule> = new Map()
  private sessionToken: string | null = null
  private initData: string

  registerModule(mod: SocketModule) {
    this.modules.set(mod.name, mod)
  }

  connect(initData: string) {
    this.initData = initData
    this.socket.auth = { initData }
    this.socket.connect()

    this.socket.on("connect", () => {
      this.modules.forEach((mod) => mod.register(this.socket))
    })

    this.socket.on("auth:success", ({ sessionToken }) => {
      this.sessionToken = sessionToken
    })

    this.socket.on("disconnect", () => {
      this.modules.forEach((mod) => mod.cleanup())
      // on next reconnect, prefer sessionToken over initData
      this.socket.auth = this.sessionToken
        ? { sessionToken: this.sessionToken }
        : { initData: this.initData }
    })

    this.socket.on("connect_error", (err) => {
      if (err.message === "SESSION_EXPIRED") {
        // session lost (server restart), fall back to initData
        this.sessionToken = null
        this.socket.auth = { initData: this.initData }
      }
    })
  }

  subscribe(moduleName: string) {
    this.socket.emit("module:subscribe", { module: moduleName })
    this.modules.get(moduleName)?.subscribe()
  }

  unsubscribe(moduleName: string) {
    this.socket.emit("module:unsubscribe", { module: moduleName })
    this.modules.get(moduleName)?.unsubscribe()
  }
}
```

### 3.6 Auth Middleware & Whitelist (server)

Auth middleware supports two paths: **initial login** (Telegram initData) and **reconnect**
(session token). This runs before the `connection` event fires.

**Path A — Session token (reconnect, fast path):**
Client sends `{ sessionToken }` in handshake auth. Server looks it up in an in-memory
`Map<string, Session>`. If found and not expired → attach user to socket, done.
If invalid or expired → reject with `SESSION_EXPIRED`. Client then retries with initData.

**Path B — Telegram initData (first connect, slow path):**
Client sends `{ initData }` in handshake auth. Server validates HMAC-SHA256 with bot token,
then checks user ID against whitelist. If both pass → create a session token (UUID v4),
store in memory with TTL (default 24h), attach user to socket, emit token back to client.

```typescript
io.use(async (socket, next) => {
  const { sessionToken, initData } = socket.handshake.auth

  // Path A: reconnect with session token
  if (sessionToken) {
    const session = sessions.get(sessionToken)
    if (session && !session.isExpired()) {
      socket.data.user = session.user
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
  socket.data.sessionToken = token   // sent to client in "auth:success"
  next()
})
```

**Session storage:** Simple `Map<string, Session>` in server memory. Sessions are cleaned up
periodically (every 10 min, remove entries older than TTL). No database needed — if the server
restarts, all sessions are lost and clients re-auth with initData (which is fine).
```

#### Whitelist management

The whitelist is a plain JSON array of Telegram user IDs stored on the server
(`server/src/config/whitelist.json`). The server reads it into memory on startup
and watches the file for live changes.

```json
// server/src/config/whitelist.json
[123456789, 987654321]
```

That's it — just an array of numbers. No names, no roles. If your ID is in the list, you have
full access. If not, you're rejected. Simple.

**Whitelist module (`server/src/auth/whitelist.ts`):**
- `load()` — reads JSON file into a `Set<number>` in memory
- `isAllowed(userId: number): boolean` — `Set.has()` check
- File watcher: `fs.watch` on `whitelist.json` → auto-reloads when the file is edited externally

**There are no socket events for whitelist.** The whitelist is managed exclusively by editing
`whitelist.json` on the server (via SSH, nano, scp, etc.). This is intentional — the whitelist
controls *who can access the device*, so it must not be modifiable through the app itself.
Any authenticated user could otherwise add arbitrary IDs.

**First-run setup:**
If `whitelist.json` does not exist on server startup, the server creates it as an empty array `[]`
and logs a warning: "Whitelist is empty. Set ADMIN_TELEGRAM_ID in .env or add IDs to whitelist.json."
If `ADMIN_TELEGRAM_ID` env var is set, that ID is auto-added to the whitelist on first run.

### 3.7 Event Naming Convention

Pattern: `<module>:<action>` for client→server, `<module>:<data_type>` for server→client.

```
Client → Server (commands)          Server → Client (data/responses)
──────────────────────────          ─────────────────────────────────
module:subscribe                    system:stats
module:unsubscribe                  system:info
system:reboot                       wifi:networks
wifi:scan                           wifi:status
wifi:connect                        (response via ack only; then wifi:status)
wifi:disconnect                     bluetooth:devices
bluetooth:scan                      bluetooth:status
bluetooth:pair                       (response via ack only; then bluetooth:status)
bluetooth:unpair                    audio:state
audio:set_volume                    camera:offer / camera:answer / camera:ice_candidate  (WebRTC signaling)
audio:set_output                    camera:snapshot_result
camera:start                        error  (global error channel)
camera:stop
camera:snapshot
storage:refresh                     storage:health

(Auth is NOT in the event table — it uses Socket.IO
handshake + connect_error, not custom events. See 4.1.)
Command responses: use Socket.IO ack callback only (see 5.1). There are no `*_result` events for commands; client uses ack + optional status events (e.g. wifi:status, bluetooth:status) for updated state.
```

### 3.8 Adding a New Module (checklist)

When adding a new feature (e.g. "gpio" control):

1. **shared/types/gpio.ts** — define data types (`GpioPin`, `GpioPinState`)
2. **shared/constants/events.ts** — add event names if custom beyond subscribe/unsubscribe
3. **server/src/socket/modules/gpio.ts** — implement `ServerSocketModule`
4. **server/src/socket/index.ts** — import & add to `modules` array
5. **app/services/socket/modules/gpio.ts** — implement client `SocketModule`
6. **app/services/socket/SocketManager.ts** — register the module
7. **app/hooks/useGpio.ts** — hook that calls subscribe/unsubscribe + exposes state
8. **app/screens/GpioScreen.tsx** — UI consuming the hook

No changes to core socket infrastructure needed.

---

## 4. Socket Event Contracts

### 4.1 Auth Events

Auth is handled via Socket.IO handshake, not custom events.

**Client → Server (via `socket.auth` in handshake):**
- First connect: `{ initData: string }`
- Reconnect: `{ sessionToken: string }`

**Server → Client (emitted after successful connection):**

```typescript
"auth:success": (data: { user: TelegramUser; sessionToken: string }) => void
```

**On auth failure:** Socket.IO middleware rejects the connection. The client receives a
`connect_error` event with `error.message` being one of:
`"AUTH_REQUIRED"` | `"AUTH_INVALID"` | `"ACCESS_DENIED"` | `"SESSION_EXPIRED"`

The client handles this in `socket.on("connect_error")` and shows the appropriate screen.

### 4.2 Module Subscribe/Unsubscribe (generic)

```typescript
// Client → Server
"module:subscribe": (payload: { module: string }) => void
"module:unsubscribe": (payload: { module: string }) => void
```

### 4.3 System Module

```typescript
// Server → Client (auto after subscribe, every 2s)
"system:stats": (data: SystemStats) => void

// Server → Client (once on subscribe)
"system:info": (data: SystemInfo) => void

// Client → Server
"system:reboot": () => void
```

### 4.4 Wi-Fi Module

```typescript
// Client → Server
"wifi:scan": () => void
"wifi:connect": (payload: { ssid: string; password?: string }) => void
"wifi:disconnect": () => void
"wifi:forget": (payload: { ssid: string }) => void

// Server → Client (no wifi:connect_result — use ack + wifi:status)
"wifi:networks": (data: WifiNetwork[]) => void
"wifi:status": (data: WifiStatus) => void
```

### 4.5 Bluetooth Module

```typescript
// Client → Server
"bluetooth:scan": () => void
"bluetooth:stop_scan": () => void
"bluetooth:pair": (payload: { mac: string; pin?: string }) => void
"bluetooth:unpair": (payload: { mac: string }) => void
"bluetooth:connect": (payload: { mac: string }) => void
"bluetooth:disconnect": (payload: { mac: string }) => void

// Server → Client (no bluetooth:pair_result — use ack + bluetooth:status)
"bluetooth:devices": (data: BluetoothDevice[]) => void
"bluetooth:status": (data: BluetoothStatus) => void
```

### 4.6 Audio Module

```typescript
// Client → Server
"audio:set_volume": (payload: { level: number }) => void
"audio:set_output": (payload: { device: string }) => void
"audio:toggle_mute": () => void
"audio:test_sound": () => void

// Server → Client
"audio:state": (data: AudioState) => void
```

### 4.7 Camera Module (WebRTC signaling)

```typescript
// Client → Server
"camera:start": (payload: { resolution: "480p" | "720p" | "1080p" }) => void
"camera:stop": () => void
"camera:snapshot": () => void

// Bidirectional (WebRTC signaling)
"camera:offer": (data: RTCSessionDescriptionInit) => void
"camera:answer": (data: RTCSessionDescriptionInit) => void
"camera:ice_candidate": (data: RTCIceCandidateInit) => void

// Server → Client
"camera:snapshot_result": (data: { base64: string; timestamp: number }) => void
"camera:error": (data: { message: string }) => void
```

### 4.8 Storage Module (SSD Health)

```typescript
// Client → Server
"storage:refresh": () => void                  // force re-read S.M.A.R.T. data

// Server → Client (once on subscribe + on refresh)
"storage:health": (data: StorageHealth) => void
```

**Server implementation notes:**
- Uses `nvme-cli` only (Pi 5 + M.2 HAT+ = NVMe SSD).
- Command: `nvme smart-log /dev/nvme0n1 -o json` → parsed JSON output.
- Drive info: `nvme id-ctrl /dev/nvme0n1 -o json` → model, serial, firmware.
- Partition data: `df --output=source,target,fstype,size,used,pcent -B1` → parsed.
- Data is NOT polled on interval (unlike system:stats). It is fetched once on subscribe
  and on explicit `storage:refresh`. S.M.A.R.T. reads take ~1s and shouldn't be spammed.
- Prerequisite: `sudo apt install nvme-cli` on the Pi.
- **Permission:** `nvme smart-log` requires read access to `/dev/nvme0n1` (typically root).
  Since the Node.js server runs as a systemd service, grant access via one of:
  - Run the service as root (simplest for single-user Pi), or
  - Add a udev rule to allow the service user read access:
    `SUBSYSTEM=="nvme", MODE="0664", GROUP="pimanager"` in `/etc/udev/rules.d/99-nvme.rules`,
    then add the service user to the `pimanager` group.

### 4.9 Global Error Channel

```typescript
// Server → Client (any module can emit this)
"error": (data: {
  module: string          // which module caused the error
  code: string            // machine-readable: "WIFI_AUTH_FAILED", "BT_DEVICE_NOT_FOUND"
  message: string         // human-readable description
}) => void
```

---

## 5. Operational Safety

### 5.1 Command Acknowledgement & Timeout

**Chosen approach: ack only (no _result events).** All command events use the Socket.IO ack callback:
client sends `socket.emit(event, payload, (err, data) => { ... })`; server calls the ack once with
`(null, result)` on success or `(errorObject)` on failure. There are **no** `*_result` events for any command
(e.g. no `wifi:connect_result`, no `bluetooth:pair_result`). For async commands (e.g. wifi:connect, bluetooth:pair),
server may call ack with `{ accepted: true }` when the operation is started, then the client relies on
**status events** (`wifi:status`, `bluetooth:status`) for the final outcome.

The client must handle both success and timeout (ack not called within T ms = timeout).

```typescript
// Client helper — typed emit with ack + timeout (idiomatic Socket.IO)
function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 10_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    socket.emit(event, payload, (err: Error | null, data?: T) => {
      clearTimeout(timer)
      if (err) reject(err)
      else resolve(data as T)
    })
  })
}
```

Server side: for every command handler, call the ack once: `ack(null, result)` or `ack(new Error("..."))`.
Do not emit a separate `*_result` event for that command.

**Timeout values per command type:**

| Command | Timeout | Reason |
|---------|---------|--------|
| `wifi:scan` | 15s | Network scan can be slow |
| `wifi:connect` | 20s | WPA handshake takes time |
| `bluetooth:scan` | 15s | Discovery window |
| `bluetooth:pair` | 15s | Pairing negotiation |
| `system:reboot` | 5s | Just needs ACK before device goes down |
| `camera:start` | 10s | WebRTC setup |
| `audio:*` | 5s | Local commands, fast |

**UI behavior during pending commands:**
- Button that triggered the command shows a spinner and is disabled
- If timeout: show toast "Command timed out. Please try again."
- If error: show toast with the error message from the `error` event

### 5.2 Rate Limiting (server-side)

Sensitive commands are rate-limited per socket connection to prevent accidental rapid-fire
(e.g., mashing the reboot button) or abuse.

| Command | Limit | Window |
|---------|-------|--------|
| `system:reboot` | 1 | 60s |
| `wifi:connect` | 3 | 30s |
| `wifi:disconnect` | 3 | 30s |
| `bluetooth:pair` | 5 | 30s |
| `bluetooth:unpair` | 5 | 30s |
| `audio:set_volume` | 20 | 5s (client debounces, but server also protects) |
| `camera:start` | 3 | 30s |
| `camera:snapshot` | 5 | 10s |
| `storage:refresh` | 3 | 30s |

**Implementation:** Simple in-memory counter per `socket.id + event`. On limit exceed,
server emits `error` with code `"RATE_LIMITED"` and does not execute the command.

```typescript
// Server rate limiter — lightweight, per-socket
const rateLimits: Record<string, { max: number; windowMs: number }> = {
  "system:reboot": { max: 1, windowMs: 60_000 },
  "wifi:connect":  { max: 3, windowMs: 30_000 },
  // ...
}

function checkRateLimit(socketId: string, event: string): boolean {
  const config = rateLimits[event]
  if (!config) return true   // no limit configured
  // ...sliding window counter logic
}
```

### 5.3 Input Validation (server-side)

All payloads received from the client are validated with `zod` before processing.
Invalid payloads are rejected immediately with an `error` event.

```typescript
// Example: wifi:connect validation
const wifiConnectSchema = z.object({
  ssid: z.string().min(1).max(64),
  password: z.string().max(128).optional(),
})

socket.on("wifi:connect", (payload) => {
  const result = wifiConnectSchema.safeParse(payload)
  if (!result.success) {
    socket.emit("error", { module: "wifi", code: "INVALID_PAYLOAD", message: result.error.message })
    return
  }
  // ...proceed with validated data
})
```

### 5.4 Confirmation for Destructive Actions

Commands that can disrupt the device require user confirmation on the frontend before emitting.
The server does **not** enforce confirmation — it trusts the client (since the user is already
authenticated and whitelisted). But the frontend must show a `ConfirmDialog` for:

- `system:reboot` — "The device will restart and disconnect. Continue?"
- `wifi:disconnect` — "You may lose access if this is the only network. Continue?"
- `bluetooth:unpair` — "Unpair {device name}?"

---

## 14. Production Deployment

### 14.1 Build Pipeline

```
1. Build frontend:   npx expo export --platform web → generates /dist (static HTML/JS/CSS)
2. Copy dist/ into:  server/public/                  (Express serves this as static files)
3. Build server:     cd server && npm run build       → compiles TS to server/dist/
4. Start server:     node server/dist/index.js        → single process on port 3001
```

### 14.2 Express Static Serving

The server serves the frontend build as static files from `server/public/`.
All non-API routes fall through to `index.html` (SPA routing).

```typescript
// server/src/index.ts — production static hosting
import express from "express"
import path from "path"

const app = express()

// Serve static frontend build
app.use(express.static(path.join(__dirname, "../public")))

// SPA fallback: any non-API GET → index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

// Socket.IO attaches to the same HTTP server
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } })
server.listen(PORT)
```

### 14.3 Cloudflare Tunnel Setup

```bash
# Install cloudflared on Pi
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Login (one-time)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create pi-manager

# Run tunnel (points to local server)
cloudflared tunnel --url http://localhost:3001 run pi-manager
```

The tunnel provides an HTTPS URL (e.g., `https://pi-manager.example.com`) that Telegram
requires for Mini App WebApp URLs.

### 14.4 Process Management (systemd)

Two systemd services on the Pi:

**pi-manager-server.service** — the Node.js server:
```
ExecStart=/usr/bin/node /home/pi/pi-manager/server/dist/index.js
Restart=always
Environment=NODE_ENV=production
```

**pi-manager-tunnel.service** — the Cloudflare tunnel:
```
ExecStart=/usr/local/bin/cloudflared tunnel run pi-manager
Restart=always
```

Both set to `enable` so they auto-start on boot.

### 14.5 Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Frontend | Expo dev server (port 8081), hot reload | Static build in `server/public/` |
| Server | `tsx watch` (auto-reload on save) | Compiled JS via `node dist/index.js` |
| URL | `http://localhost:8081` (web) | `https://pi.example.com` (Cloudflare) |
| Socket URL | `http://localhost:3001` | Same origin (relative `/socket.io/`) |
| HTTPS | Not needed | Provided by Cloudflare Tunnel |
| Process | Terminal / manual | systemd + auto-restart |

---

## Appendix A: Server Bootstrap (copy-paste ready)

### A.1 server/package.json

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

### A.2 server/tsconfig.json

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

### A.3 server/src/index.ts (full entry point)

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
  pingTimeout: 20_000,
})

setupSocketServer(io)

server.listen(PORT, () => {
  console.log(`[pi-manager] server listening on http://localhost:${PORT}`)
  console.log(`[pi-manager] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`)
})
```

### A.4 server/src/socket/index.ts (socket bootstrap + auth middleware)

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
  systemModule,
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
        socket.emit("error", { module: name, code: "MODULE_NOT_FOUND", message: `Unknown module: ${name}` })
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

### A.5 server/src/socket/types.ts

```typescript
import { Server, Socket } from "socket.io"

export interface ServerSocketModule {
  name: string
  register(socket: Socket, io: Server): void
  onSubscribe(socket: Socket): void
  onUnsubscribe(socket: Socket): void
}
```

### A.6 server/src/auth/telegram.ts

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

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest()

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

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
      languageCode: raw.language_code,
    }
  } catch {
    return null
  }
}
```

### A.7 server/src/auth/whitelist.ts

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
          console.warn("[whitelist] Empty whitelist created. Set ADMIN_TELEGRAM_ID in .env or edit whitelist.json.")
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

---

## Appendix B: Shared Socket Event Map (copy-paste ready)

This is the complete `shared/types/socket-events.ts` file. Both client and server import it
to get full type safety on all socket events.

```typescript
// shared/types/socket-events.ts

import type { SystemStats, SystemInfo } from "./system"
import type { WifiNetwork, WifiStatus } from "./wifi"
import type { BluetoothDevice, BluetoothStatus } from "./bluetooth"
import type { AudioState } from "./audio"
import type { StorageHealth } from "./storage"
import type { TelegramUser } from "./telegram"

// ─── Client → Server ────────────────────────────────────────────────

export interface ClientToServerEvents {
  // Module lifecycle
  "module:subscribe": (payload: { module: string }) => void
  "module:unsubscribe": (payload: { module: string }) => void

  // System
  "system:reboot": () => void

  // Wi-Fi
  "wifi:scan": () => void
  "wifi:connect": (payload: { ssid: string; password?: string }) => void
  "wifi:disconnect": () => void
  "wifi:forget": (payload: { ssid: string }) => void

  // Bluetooth
  "bluetooth:scan": () => void
  "bluetooth:stop_scan": () => void
  "bluetooth:pair": (payload: { mac: string; pin?: string }) => void
  "bluetooth:unpair": (payload: { mac: string }) => void
  "bluetooth:connect": (payload: { mac: string }) => void
  "bluetooth:disconnect": (payload: { mac: string }) => void

  // Audio
  "audio:set_volume": (payload: { level: number }) => void
  "audio:set_output": (payload: { device: string }) => void
  "audio:toggle_mute": () => void
  "audio:test_sound": () => void

  // Camera
  "camera:start": (payload: { resolution: "480p" | "720p" | "1080p" }) => void
  "camera:stop": () => void
  "camera:snapshot": () => void
  "camera:answer": (data: RTCSessionDescriptionInit) => void
  "camera:ice_candidate": (data: RTCIceCandidateInit) => void

  // Storage / SSD Health
  "storage:refresh": () => void
}

// ─── Server → Client ────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Auth (emitted once after connection)
  "auth:success": (data: { user: TelegramUser; sessionToken: string }) => void

  // System
  "system:stats": (data: SystemStats) => void
  "system:info": (data: SystemInfo) => void

  // Wi-Fi (command response via ack; no wifi:connect_result)
  "wifi:networks": (data: WifiNetwork[]) => void
  "wifi:status": (data: WifiStatus) => void

  // Bluetooth (command response via ack; no bluetooth:pair_result)
  "bluetooth:devices": (data: BluetoothDevice[]) => void
  "bluetooth:status": (data: BluetoothStatus) => void

  // Audio
  "audio:state": (data: AudioState) => void

  // Camera (WebRTC signaling)
  "camera:offer": (data: RTCSessionDescriptionInit) => void
  "camera:ice_candidate": (data: RTCIceCandidateInit) => void
  "camera:snapshot_result": (data: { base64: string; timestamp: number }) => void
  "camera:error": (data: { message: string }) => void

  // Storage / SSD Health
  "storage:health": (data: StorageHealth) => void

  // Global error
  "error": (data: { module: string; code: string; message: string }) => void
}

// ─── Socket.IO typed usage ──────────────────────────────────────────

// Server:
//   import { Server } from "socket.io"
//   const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer)
//
// Client:
//   import { io } from "socket.io-client"
//   const socket = io<ServerToClientEvents, ClientToServerEvents>(url)
```

---

## Appendix C: Telegram Mini App Integration (detailed)

### C.1 Getting initData on the frontend

Telegram injects a global `window.Telegram.WebApp` object into the Mini App iframe.
The `initData` string is available immediately.

```typescript
// app/services/telegram.ts

interface TelegramWebApp {
  initData: string            // URL-encoded query string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
      language_code?: string
    }
    auth_date: number
    hash: string
  }
  ready(): void               // tell Telegram the app is ready
  expand(): void              // expand to full height
  close(): void               // close the Mini App
  MainButton: {
    text: string
    show(): void
    hide(): void
    onClick(cb: () => void): void
  }
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function getInitData(): string | null {
  return getTelegramWebApp()?.initData || null
}

export function isTelegramMiniApp(): boolean {
  return !!getInitData()
}
```

### C.2 TelegramAuthScreen (frontend)

This screen is the first screen shown. It reads initData, connects the socket,
and waits for `auth:success` before navigating to the main app.

```typescript
// app/screens/TelegramAuthScreen.tsx — logic outline

export const TelegramAuthScreen: FC = function TelegramAuthScreen() {
  const { themed } = useAppTheme()
  const { socketManager } = useSocket()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [errorCode, setErrorCode] = useState("")

  useEffect(() => {
    const tg = getTelegramWebApp()
    if (tg) {
      tg.ready()     // tell Telegram the WebApp is ready
      tg.expand()    // expand to full screen height
    }

    const initData = getInitData()

    if (!initData) {
      // Not running inside Telegram — dev mode fallback
      if (__DEV__) {
        // In dev, use a mock initData or skip auth
        socketManager.connectDev()
        return
      }
      setStatus("error")
      setErrorCode("NOT_IN_TELEGRAM")
      return
    }

    socketManager.connect(initData)

    // auth:success is handled by SocketProvider → navigates to MainTabs
    // connect_error is handled here:
    socketManager.onConnectError((err) => {
      setStatus("error")
      setErrorCode(err.message) // "AUTH_INVALID" | "ACCESS_DENIED" | etc.
    })
  }, [])

  if (status === "error" && errorCode === "ACCESS_DENIED") {
    // navigate to AccessDeniedScreen
  }

  // Show loading spinner while auth is in progress
  return (/* loading UI */)
}
```

### C.3 Dev mode: bypassing Telegram auth locally

When running on `localhost:8081` outside of Telegram, `window.Telegram` does not exist.
For development, the server accepts a special dev-only auth path:

```typescript
// server/src/socket/index.ts — in the auth middleware, before Path B:

// DEV ONLY: allow connection without Telegram initData
if (process.env.NODE_ENV !== "production" && !initData && !sessionToken) {
  const devUser = { id: 0, firstName: "Developer" }
  socket.data.user = devUser
  socket.data.sessionToken = crypto.randomUUID()
  sessions.set(socket.data.sessionToken, { user: devUser, createdAt: Date.now() })
  return next()
}
```

This block is skipped in production. In dev, you can connect without Telegram.

### C.4 Server-side validate (already in Appendix A.6)

See `server/src/auth/telegram.ts` in Appendix A.6 for the complete HMAC validation function.

Key points:
- **Input:** raw `initData` string (URL-encoded query params from Telegram)
- **Process:** Sort params alphabetically, compute HMAC-SHA256, compare with `hash` param
- **Freshness:** Reject if `auth_date` is > 1 hour old
- **Output:** `TelegramUser` object or `null`

### C.5 Telegram Bot setup (@BotFather)

```
1. Open @BotFather on Telegram
2. /newbot → give it a name → get BOT_TOKEN
3. /setmenubutton → set the Mini App URL:
   URL: https://pi.example.com (your Cloudflare Tunnel URL)
   Button text: "Open Pi Manager"
4. /setwebapp (or via Bot API) → same URL
5. Save BOT_TOKEN to server/.env
```

---

## Appendix D: Cloudflare Tunnel — Production Config

### D.1 Named tunnel with config file (recommended)

Quick tunnels (`--url`) are for dev. For production, use a named tunnel with a config file
so it survives reboots and binds to a stable hostname.

```bash
# 1. Install cloudflared (already in section 14.3)

# 2. Login to Cloudflare (one-time, opens browser)
cloudflared tunnel login

# 3. Create a named tunnel
cloudflared tunnel create pi-manager
# Outputs: Created tunnel pi-manager with id <TUNNEL_ID>

# 4. Route DNS: bind a subdomain to the tunnel
cloudflared tunnel route dns pi-manager pi.example.com
# This creates a CNAME record: pi.example.com → <TUNNEL_ID>.cfargotunnel.com
```

### D.2 Config file: ~/.cloudflared/config.yml

```yaml
tunnel: <TUNNEL_ID>           # from step 3 above
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:3001
  - service: http_status:404   # catch-all for unknown hostnames
```

### D.3 Run with config

```bash
# Manual run (uses config.yml automatically)
cloudflared tunnel run pi-manager

# Or specify config explicitly
cloudflared tunnel --config /home/pi/.cloudflared/config.yml run pi-manager
```

### D.4 systemd service (production)

```ini
# /etc/systemd/system/pi-manager-tunnel.service
[Unit]
Description=Pi Manager Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/pi/.cloudflared/config.yml run pi-manager
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pi-manager-tunnel
sudo systemctl start pi-manager-tunnel
```

### D.5 WebSocket support

Cloudflare Tunnel natively supports WebSocket. No special config needed.
Socket.IO will connect over WSS (`wss://pi.example.com/socket.io/`) automatically
because the tunnel provides TLS termination.

---

## Appendix E: WebRTC Camera Stack (detailed)

### E.1 Stack choice

```
Pi camera module
    │
    ▼
libcamera-vid (built-in on Raspberry Pi OS)
    │  outputs H.264 stream to stdout or TCP
    ▼
GStreamer or node-webrtc (werift)
    │  packages raw stream into WebRTC
    ▼
Socket.IO signaling
    │  exchanges SDP offer/answer + ICE candidates
    ▼
Browser <video> element (WebRTC peer)
```

**Chosen approach:** `libcamera-vid` → pipes H.264 to `werift` (pure JS WebRTC library).
`werift` is chosen over `wrtc` because `wrtc` has native binary dependencies that
are problematic on ARM64 (Raspberry Pi). `werift` is pure TypeScript, works everywhere.

### E.2 Default configuration & constraints

| Setting | Default | Min | Max | Notes |
|---------|---------|-----|-----|-------|
| Resolution | 720p (1280×720) | 480p (640×480) | 1080p (1920×1080) | User-selectable |
| FPS | 24 | 15 | 30 | Lower if CPU > 80% |
| Bitrate | 1500 kbps | 500 kbps | 3000 kbps | Adaptive based on bandwidth |
| Codec | H.264 (Baseline) | — | — | Hardware-encoded on Pi |

### E.3 CPU impact & adaptive quality

Streaming consumes ~15–30% CPU on Pi 4 (H.264 hardware encoder offloads most work).
If `system:stats` shows CPU > 80% during stream, the server automatically:
1. Drops FPS to 15
2. Reduces bitrate to 500 kbps
3. Emits `camera:error` with message "Quality reduced due to high CPU load"

### E.4 Server camera module outline

```typescript
// server/src/socket/modules/camera.ts

import { spawn, ChildProcess } from "node:child_process"
import { RTCPeerConnection } from "werift"
import type { ServerSocketModule } from "../types.js"

const RESOLUTIONS = {
  "480p": { width: 640, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
} as const

let cameraProcess: ChildProcess | null = null
let peerConnection: RTCPeerConnection | null = null

export const cameraModule: ServerSocketModule = {
  name: "camera",

  register(socket, _io) {
    socket.on("camera:start", async ({ resolution }) => {
      const res = RESOLUTIONS[resolution] ?? RESOLUTIONS["720p"]

      // Start libcamera-vid, output H.264 to stdout
      cameraProcess = spawn("libcamera-vid", [
        "--width", String(res.width),
        "--height", String(res.height),
        "--framerate", "24",
        "--bitrate", "1500000",
        "--codec", "h264",
        "--inline",     // include SPS/PPS in stream
        "--nopreview",
        "-t", "0",      // run indefinitely
        "-o", "-",      // output to stdout
      ])

      // Create WebRTC peer connection, add H.264 track from stdout,
      // create offer, send to client — signaling via socket events
      // (implementation depends on werift API)
    })

    socket.on("camera:stop", () => {
      cameraProcess?.kill("SIGTERM")
      cameraProcess = null
      peerConnection?.close()
      peerConnection = null
    })

    socket.on("camera:snapshot", () => {
      // Use libcamera-still for single frame capture
      const proc = spawn("libcamera-still", [
        "--width", "1280",
        "--height", "720",
        "--encoding", "jpg",
        "--quality", "85",
        "-o", "-",        // output to stdout
        "--nopreview",
        "-t", "1",
      ])

      const chunks: Buffer[] = []
      proc.stdout.on("data", (chunk) => chunks.push(chunk))
      proc.on("close", () => {
        const base64 = Buffer.concat(chunks).toString("base64")
        socket.emit("camera:snapshot_result", { base64, timestamp: Date.now() })
      })
    })

    // WebRTC signaling handlers
    socket.on("camera:answer", (answer) => {
      peerConnection?.setRemoteDescription(answer)
    })

    socket.on("camera:ice_candidate", (candidate) => {
      peerConnection?.addIceCandidate(candidate)
    })
  },

  onSubscribe(_socket) { /* camera starts on explicit "camera:start", not on subscribe */ },
  onUnsubscribe(socket) {
    // Clean up if user disconnects while streaming
    cameraProcess?.kill("SIGTERM")
    cameraProcess = null
    peerConnection?.close()
    peerConnection = null
  },
}
```

### E.5 Fallbacks & error handling

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| No camera module connected | `libcamera-vid` exits with code 1 | Emit `camera:error` "No camera detected" |
| Camera busy (another process) | Exit code or stderr contains "EBUSY" | Emit `camera:error` "Camera is in use by another process" |
| libcamera not installed | `ENOENT` spawn error | Emit `camera:error` "libcamera-vid not found. Install with: sudo apt install libcamera-apps" |
| WebRTC connection fails | ICE connection state "failed" | Emit `camera:error` "Connection failed. Check network." |
| Browser doesn't support WebRTC | Client-side check before emitting `camera:start` | Show "Your browser does not support live streaming" in UI |

---

## 8. Data Types (shared/)

```typescript
// shared/types/system.ts
interface SystemStats {
  cpu: {
    usage: number           // 0–100
    temperature: number     // °C
    model: string           // "Cortex-A72"
    cores: number
    frequency: number       // MHz, current
  }
  memory: {
    total: number           // bytes
    used: number
    free: number
    percent: number         // 0–100
  }
  disk: Array<{
    filesystem: string
    size: number            // bytes
    used: number
    mount: string
    percent: number
  }>
  network: Array<{
    iface: string           // "wlan0", "eth0"
    ip4: string
    mac: string
    speed: number | null    // Mbps
    isUp: boolean
  }>
  uptime: number            // seconds
}

interface SystemInfo {
  hostname: string
  os: {
    distro: string          // "Raspbian GNU/Linux"
    release: string         // "12"
    codename: string        // "Bookworm"
    kernel: string          // "6.1.0-rpi7-rpi-v8"
    arch: string            // "arm64"
  }
  hardware: {
    model: string           // "Raspberry Pi 4 Model B Rev 1.4"
    serial: string
  }
}

// shared/types/wifi.ts
interface WifiNetwork {
  ssid: string
  signal: number            // 0–100
  security: "WPA2" | "WPA3" | "WEP" | "Open"
  frequency: number         // MHz
  channel: number
  bssid: string
  connected: boolean
}

interface WifiStatus {
  connected: boolean
  ssid?: string
  ip?: string
  signal?: number
  speed?: string            // "72 Mbps"
  gateway?: string
  dns?: string[]
}

// shared/types/bluetooth.ts
interface BluetoothDevice {
  name: string | null
  mac: string
  rssi: number
  paired: boolean
  connected: boolean
  type: "audio" | "input" | "display" | "unknown"
  icon: string              // mapped from type
}

interface BluetoothStatus {
  powered: boolean
  discoverable: boolean
  discovering: boolean
  connectedDevices: BluetoothDevice[]
}

// shared/types/audio.ts
interface AudioState {
  volume: number            // 0–100
  muted: boolean
  output: string            // active output id
  availableOutputs: Array<{
    id: string              // "hdmi", "analog", "bluez_sink.XX_XX_XX"
    name: string            // "HDMI", "3.5mm Jack", "JBL Flip 6"
    type: "hdmi" | "analog" | "bluetooth" | "usb"
  }>
}

// shared/types/camera.ts
type CameraResolution = "480p" | "720p" | "1080p"

interface CameraConfig {
  resolution: CameraResolution
  fps: number
  bitrate: number           // kbps
}

// shared/types/storage.ts
interface StorageHealth {
  device: string                  // "/dev/nvme0n1"
  model: string                   // "Samsung 970 EVO Plus 250GB"
  serial: string                  // drive serial number
  firmware: string                // firmware version
  size: number                    // bytes, total capacity
  temperature: number             // °C
  percentageUsed: number          // 0–100, lifespan consumed
  powerOnHours: number            // total hours powered on
  dataUnitsWritten: number        // data units written (each unit = 512KB × 1000)
  dataUnitsRead: number           // data units read
  mediaErrors: number             // media/integrity errors (should be 0)
  unsafeShutdowns: number         // unexpected power loss count
  errorLogEntries: number         // number of error log entries
  availableSpare: number          // 0–100%, remaining spare blocks
  availableSpareThreshold: number // threshold below which spare is critical
  criticalWarning: number         // critical warning bitmap (0 = no warnings)
  partitions: DiskPartition[]     // mounted partitions from df
}

interface DiskPartition {
  device: string                  // "/dev/nvme0n1p1"
  mount: string                   // "/"
  filesystem: string              // "ext4", "vfat"
  size: number                    // bytes
  used: number                    // bytes
  percent: number                 // 0–100
}

// shared/types/telegram.ts
interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

interface AuthPayload {
  initData: string          // raw Telegram WebApp initData
}

```

---


## 9. Tech Stack

### Frontend (app/)

| Package | Purpose |
|---------|---------|
| expo ~54 | Build toolchain |
| react-native 0.81.5 + react-native-web | Cross-platform UI |
| react 19 | Core |
| @react-navigation/native v7 | Navigation (stack + bottom tabs) |
| react-native-mmkv | Local storage |
| i18next + react-i18next | Internationalization |
| apisauce | REST fallback |
| socket.io-client | **(to install)** WebSocket client |
| react-native-reanimated | Animations, skeleton loaders, value transitions |
| react-native-svg | **(to install)** Icons, progress rings |

### Backend (server/)

| Package | Purpose |
|---------|---------|
| express | Minimal HTTP (health check, file upload) |
| socket.io | WebSocket server |
| systeminformation | Hardware stats |
| child_process (nmcli) | Wi-Fi management (nmcli only; no node-wifi) |
| child_process (bluetoothctl) | Bluetooth management |
| child_process (amixer/pactl) | Audio control |
| werift | WebRTC for camera (pure JS; wrtc has native deps, avoid on ARM64) |
| dotenv | Environment variables |
| zod | Runtime type validation |

### Infrastructure

| Tool | Purpose |
|------|---------|
| cloudflared | HTTPS tunnel |
| Telegram Bot API | Bot + Mini App |
| systemd | Auto-start on boot + process management (no pm2; use systemd only) |

---

## 10. Provider Hierarchy (app.tsx)

```
SafeAreaProvider
  └─ KeyboardProvider
      └─ ThemeProvider
          └─ SocketProvider          ← (new) manages socket connection
              └─ AuthProvider         ← (new) manages Telegram auth state
                  └─ AppNavigator
```

---

## 11. Current State (as-is, same as OVERVIEW)

- Scaffolded with Ignite CLI. **No `server/` or `shared/` yet** — created in Phase 1.
- `WelcomeScreen` is the only active screen — will be reused as DashboardScreen. No Socket.IO or Telegram integration yet.
- Existing components: Button, Text, TextField, Card, Header, Icon, ListItem, Screen, Toggle. Theme: light/dark, Space Grotesk, `themed()` helper.

---

## 12. Development Roadmap

**Phase 0 (theme):** See **UI.md** for full checklist, palette copy-paste, and feature accent map. Do Phase 0 before any UI work.

### Phase 1 — Foundation

- [ ] Create `server/` folder with Node.js + Express + Socket.IO project
- [ ] Create `shared/` folder with TypeScript types
- [ ] Implement auth middleware (Telegram initData → session token flow)
- [ ] Implement whitelist.ts (load JSON, `isAllowed()` check, file watcher)
- [ ] Implement SocketManager class (client) with module registry pattern
- [ ] Implement SocketProvider + useSocket hook (with session token reconnect)
- [ ] Implement server socket bootstrap with module loader
- [ ] Implement system module (server: systeminformation → client: useSystemStats)
- [ ] Build new components: StatCard, ProgressBar, ConnectionBadge, SkeletonLoader
- [ ] Rename WelcomeScreen → DashboardScreen (reuse existing file as initial route, rewrite content)
- [ ] Set up BottomTab navigation (Dashboard, Control, Settings)

### Phase 2 — Core Peripherals

- [ ] Wi-Fi module (server + client) + WifiScreen
- [ ] Bluetooth module (server + client) + BluetoothScreen
- [ ] Audio module (server + client) + AudioScreen
- [ ] Storage module (server: nvme-cli → client: useStorageHealth) + StorageScreen
- [ ] Build components: NetworkListItem, DeviceListItem, VolumeSlider, BottomSheet
- [ ] ControlMenuScreen with FeatureCard grid
- [ ] SettingsScreen (theme, language, connection info)

### Phase 3 — Camera & WebRTC

- [ ] WebRTC signaling over Socket.IO (server)
- [ ] CameraScreen with VideoPlayer component
- [ ] Snapshot capture & download
- [ ] Resolution selector

### Phase 4 — Telegram Integration

- [ ] Telegram Bot setup (`/start` → opens Mini App)
- [ ] Auth flow: validate initData HMAC
- [ ] AuthProvider + TelegramAuthScreen
- [ ] Cloudflare Tunnel setup guide
- [ ] Notification system (CPU alert, disk full)

### Phase 5 — Safety & Production

- [ ] Command ack/timeout wrapper (client `emitWithAck` helper)
- [ ] Server-side rate limiting for sensitive commands
- [ ] Server-side payload validation with zod
- [ ] Confirmation dialogs for destructive actions (reboot, disconnect)
- [ ] Production build pipeline (Expo web export → Express static serve)
- [ ] Cloudflare Tunnel + systemd setup on Pi
- [ ] Error boundaries per module
- [ ] Skeleton loaders + value animations
- [ ] Responsive layout breakpoints
- [ ] E2E tests (Maestro)
- [ ] CI/CD pipeline

---


## 13. Commands

```bash
# Frontend — development
yarn install              # install dependencies
yarn start                # start Expo dev server (all platforms)
yarn web                  # start web dev server only (port 8081)
yarn test                 # run tests
yarn lint                 # lint
npm run gscreen <Name>    # generate screen
npm run gcomponent <Name> # generate component

# Frontend — production build
npx expo export --platform web    # outputs to dist/

# Server — development
cd server
npm install
npm run dev               # start with tsx watch (auto-reload)

# Server — production
cd server
npm run build             # compile TypeScript → dist/
npm start                 # node dist/index.js

# Tunnel
cloudflared tunnel --url http://localhost:3001
```

## 15. Environment Variables

```env
# Frontend (.env)
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001

# Server (server/.env)
PORT=3001
TELEGRAM_BOT_TOKEN=xxxx
ALLOWED_ORIGINS=http://localhost:8081,https://pi.example.com
ADMIN_TELEGRAM_ID=123456789      # first admin user (auto-added to whitelist on first run)
```

---

## Appendix F: Quick Start — Run Locally in 5 Minutes

### Prerequisites

- Node.js >= 20
- Yarn (for frontend) and npm (for server)
- A Raspberry Pi with camera module (for camera features; other features work on any machine)
- Optional: Telegram bot token (for auth; dev mode works without it)

### Step-by-step

```bash
# 1. Clone and install frontend
cd /path/to/pi-manager
yarn install

# 2. Set up server
mkdir -p server/src/config
cd server
npm install
cp .env.example .env   # or create manually:
#   PORT=3001
#   TELEGRAM_BOT_TOKEN=       (leave empty for dev)
#   ALLOWED_ORIGINS=http://localhost:8081
#   ADMIN_TELEGRAM_ID=        (leave empty for dev)
cd ..

# 3. Create shared types (if not yet created)
mkdir -p shared/types shared/constants

# 4. Start server (terminal 1)
cd server
npm run dev
# Expected output:
#   [whitelist] Empty whitelist created. Set ADMIN_TELEGRAM_ID...
#   [pi-manager] server listening on http://localhost:3001
#   [pi-manager] allowed origins: http://localhost:8081

# 5. Start frontend (terminal 2)
cd /path/to/pi-manager
yarn web
# Expected output:
#   Starting Metro Bundler
#   Web is ready at http://localhost:8081

# 6. Open browser
#   → http://localhost:8081
#   → In dev mode (no Telegram), auth is bypassed automatically
#   → You should see the TelegramAuthScreen briefly, then DashboardScreen

# 7. Verify socket connection
#   → Browser DevTools → Network → WS tab
#   → You should see a WebSocket connection to localhost:3001
#   → Messages: auth:success, system:stats (every 2s)
```

### Verification checklist

| Check | How to verify | Expected |
|-------|---------------|----------|
| Server running | `curl http://localhost:3001/api/health` | `{"status":"ok","uptime":...}` |
| Frontend running | Open `http://localhost:8081` | App loads, no white screen |
| Socket connected | Browser DevTools → WS tab | WebSocket to `:3001`, messages flowing |
| System stats | Dashboard screen | CPU %, RAM, disk values updating every 2s |
| Auth bypass (dev) | Console logs | `[socket] connected: Developer (0)` |

### Running on actual Pi (with Telegram)

```bash
# Same steps as above, but additionally:

# 1. Set real env vars
echo 'TELEGRAM_BOT_TOKEN=123456:ABC...' >> server/.env
echo 'ADMIN_TELEGRAM_ID=your_telegram_id' >> server/.env
echo 'ALLOWED_ORIGINS=http://localhost:8081,https://pi.example.com' >> server/.env

# 2. Build frontend for production
npx expo export --platform web
cp -r dist/* server/public/

# 3. Build & start server in production mode
cd server
npm run build
NODE_ENV=production npm start

# 4. Start Cloudflare Tunnel (separate terminal)
cloudflared tunnel run pi-manager

# 5. Open Telegram → your bot → tap "Open Pi Manager"
#    → Mini App loads → auth with Telegram → Dashboard appears
```

---

*Last updated: 2026-02-20*
