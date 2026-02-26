# Pi Manager — Project Specification

> AI-consumable document. This is the single source of truth for project architecture,
> socket protocol, UI design, and implementation guidelines. Keep it current.

---

## 1. Overview

**Pi Manager** is a mobile-first dashboard for remotely managing a Raspberry Pi device.
It provides real-time monitoring (CPU, RAM, disk, SSD health), peripheral control (Wi-Fi, Bluetooth, audio),
and camera streaming (WebRTC) — all through a React Native Web app embedded inside a Telegram Mini App.

### Deployment Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Raspberry Pi (single device)                          │
│                                                                                  │
│  ┌──────────────────────────────────────────┐                                    │
│  │     Node.js Server (Express + Socket.IO) │──► OS / GPIO APIs                  │
│  │     port 3001                            │    (nmcli, amixer, bluetoothctl,    │
│  │                                          │     libcamera, etc.)               │
│  │     • Serves static frontend build       │                                    │
│  │     • Socket.IO WebSocket endpoint       │                                    │
│  │     • WebRTC signaling                   │                                    │
│  └──────────────┬───────────────────────────┘                                    │
│                 │                                                                 │
└─────────────────┼─────────────────────────────────────────────────────────────────┘
                  │
                  │  cloudflared tunnel (HTTPS)
                  ▼
         ┌─────────────────┐
         │  Telegram Bot    │  ← WebApp embed (Mini App iframe)
         │  end-user opens  │     URL: https://pi.example.com
         └─────────────────┘
```

**In production, there is a single server process.** The Express server serves both the static
frontend build (React Native Web) and the Socket.IO WebSocket endpoint on the same port.
No separate Expo dev server. Cloudflare Tunnel exposes this single port to the internet.

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React Native Web, Expo SDK 54, React 19, TypeScript | UI, runs in browser |
| Backend | Node.js, Express, Socket.IO | Runs on the Pi, talks to hardware |
| Tunnel | Cloudflare Tunnel (`cloudflared`) | Exposes local to internet via HTTPS |
| Client | Telegram Bot API + Mini App SDK | Entry point for users |
| Camera | WebRTC (signaling over Socket.IO) | P2P video stream from Pi camera |

### Core Principles

- **Real-time first** — all data flows over WebSocket. REST only for file upload / initial health check.
- **One Pi, one server** — backend runs directly on the Pi it manages. No multi-device orchestration (v1).
- **Mobile-first** — optimized for Telegram Mini App viewport (375–430 px). Must look great on small screens.
- **Modular sockets** — every feature is a self-contained socket module. Adding a new feature = adding a new module on both client and server. No monolithic event handlers.
- **Offline-tolerant** — graceful disconnect/reconnect with visual feedback.
- **Whitelist-gated** — only Telegram user IDs present in a configurable whitelist can access the app. All others are rejected at the socket auth layer.

---

## 2. Project Structure (monorepo)

> `server/` sits alongside `app/` inside the same repository.
> They share TypeScript types via a `shared/` directory.

```
pi-manager/
├── app/                            # ← React Native frontend (Expo)
│   ├── app.tsx                     #    Root component, provider tree
│   ├── components/                 #    Reusable UI components
│   ├── config/                     #    Environment configs
│   ├── context/                    #    (planned) Global contexts (Socket, Auth)
│   ├── hooks/                      #    (planned) Feature hooks (useSystemStats, useWifi...)
│   ├── i18n/                       #    Translations
│   ├── navigators/                 #    React Navigation stacks & tabs
│   ├── screens/                    #    Screen components
│   ├── services/
│   │   ├── api/                    #    REST client (apisauce) — fallback only
│   │   └── socket/                 #    (planned) Socket.IO client, module registry
│   ├── theme/                      #    Design tokens (colors, spacing, typography)
│   └── utils/                      #    Storage (MMKV), helpers
│
├── server/                         # ← Node.js backend (runs on Pi)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                #    Entry: Express + Socket.IO bootstrap
│   │   ├── socket/
│   │   │   ├── index.ts            #    Socket.IO server setup, middleware, module loader
│   │   │   └── modules/            #    One file per feature module
│   │   │       ├── system.ts       #    CPU, RAM, disk, uptime (systeminformation)
│   │   │       ├── wifi.ts         #    nmcli wrapper
│   │   │       ├── bluetooth.ts    #    bluetoothctl wrapper
│   │   │       ├── audio.ts        #    amixer / pactl wrapper
│   │   │       ├── camera.ts       #    libcamera + WebRTC signaling
│   │   │       └── storage.ts      #    nvme-cli wrapper (NVMe SSD health)
│   │   ├── auth/
│   │   │   ├── telegram.ts         #    Validate Telegram initData HMAC
│   │   │   └── whitelist.ts        #    Load/check/manage allowed Telegram user IDs
│   │   ├── config/
│   │   │   └── whitelist.json      #    Persistent whitelist file (gitignored)
│   │   ├── utils/
│   │   │   └── shell.ts            #    Safe child_process exec wrapper
│   │   └── types/                  #    Server-only types
│   └── tests/
│
├── shared/                         # ← Shared TypeScript types & constants
│   ├── types/
│   │   ├── socket-events.ts        #    ClientToServer & ServerToClient event maps
│   │   ├── system.ts               #    SystemStats, CpuInfo, MemoryInfo...
│   │   ├── wifi.ts                 #    WifiNetwork, WifiStatus
│   │   ├── bluetooth.ts            #    BluetoothDevice, BluetoothStatus
│   │   ├── audio.ts                #    AudioState
│   │   ├── camera.ts               #    RTCSignal, CameraConfig
│   │   ├── storage.ts              #    StorageHealth, DiskPartition
│   │   └── telegram.ts             #    TelegramUser, AuthPayload
│   └── constants/
│       └── events.ts               #    Event name string literals
│
├── docs/
│   └── PROJECT.md                  #    This file
├── package.json                    #    Root (workspace config)
└── ...config files
```

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
wifi:connect                        wifi:connect_result
wifi:disconnect                     bluetooth:devices
bluetooth:scan                      bluetooth:status
bluetooth:pair                      bluetooth:pair_result
bluetooth:unpair                    audio:state
audio:set_volume                    camera:signal
audio:set_output                    camera:snapshot_result
camera:start                        error  (global error channel)
camera:stop
camera:snapshot
storage:refresh                     storage:health

(Auth is NOT in the event table — it uses Socket.IO
handshake + connect_error, not custom events. See 4.1.)
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

// Server → Client
"wifi:networks": (data: WifiNetwork[]) => void
"wifi:status": (data: WifiStatus) => void
"wifi:connect_result": (data: { success: boolean; error?: string }) => void
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

// Server → Client
"bluetooth:devices": (data: BluetoothDevice[]) => void
"bluetooth:status": (data: BluetoothStatus) => void
"bluetooth:pair_result": (data: { mac: string; success: boolean; error?: string }) => void
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

All command events (client → server) that trigger a side effect use a **request/response pattern**.
The client must handle both success and timeout.

**Pattern:** For every command event, the client waits for a corresponding `_result` event or
a global `error` event. If neither arrives within the timeout, the client shows a timeout error.

```typescript
// Client helper — wraps any command with timeout
function emitWithAck(
  socket: Socket,
  event: string,
  payload: unknown,
  responseEvent: string,
  timeoutMs = 10_000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)

    socket.once(responseEvent, (data) => {
      clearTimeout(timer)
      resolve(data)
    })
    socket.once("error", (err) => {
      if (err.module === event.split(":")[0]) {
        clearTimeout(timer)
        reject(err)
      }
    })

    socket.emit(event, payload)
  })
}
```

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

## 6. UI Design Specification

### 6.1 Design Principles

- **Dark-first**: The app targets a Pi terminal/IoT audience. Dark theme is default, light optional.
- **Colorful & vibrant**: Every feature has its own accent color. Cards, icons, and progress bars use color to communicate meaning — not just black/white/gray.
- **Card-based layout**: Every feature section is a Card with rounded corners (borderRadius `md` = 16), subtle shadows, and tinted icon badges.
- **Generous spacing**: Items in lists and grids always have visible gaps. No elements touching or feeling cramped. Minimum gap between cards/items = `sm` (12px), preferred = `md` (16px).
- **Minimal chrome**: No heavy headers. Thin tab bar at the bottom. Content fills the screen.
- **Status colors**: green = healthy/connected, amber = warning/loading, red = error/disconnected. These colors appear frequently — on badges, progress bars, icons, and text.
- **Responsive**: Works in 375px (Telegram Mini App) up to 768px (tablet/desktop browser).
- **Smooth transitions**: Use `react-native-reanimated` for layout animations, skeleton loaders while data loads.
- **All-or-nothing access**: If you're in the whitelist, you have full access. No role tiers.

### 6.2 Color Palette (extended for Pi Manager)

**IMPORTANT:** The Ignite default palette (warm neutrals, brown tints) MUST be replaced with
this modern IoT palette. Update both `app/theme/colors.ts` and `app/theme/colorsDark.ts`.
Do NOT keep the default Ignite browns/beiges — they make the app look dull and monotone.

```
Semantic Token        Light Mode          Dark Mode           Usage
────────────────────  ──────────────────  ──────────────────  ─────────────────────────
background            #F0F2F5             #0F172A             Screen backgrounds (cool gray, not warm beige)
surface               #FFFFFF             #1E293B             Card backgrounds
surfaceElevated       #FFFFFF             #334155             Elevated cards, modals, bottom sheets
text                  #1E293B             #F1F5F9             Primary text
textDim               #64748B             #94A3B8             Secondary text, labels, captions
border                #E2E8F0             #334155             Card borders, dividers (subtle, not heavy)
tint                  #6366F1             #818CF8             Primary action color (indigo)
tintDim               #A5B4FC             #6366F180           Inactive/disabled tint
success               #10B981             #34D399             Connected, healthy, good values
warning               #F59E0B             #FBBF24             Loading, caution, moderate values
error                 #EF4444             #F87171             Disconnected, errors, critical values
info                  #3B82F6             #60A5FA             Informational badges, links
```

**Feature accent colors** — each feature has a unique tint used for its icon badge and highlights:

```
Feature       Accent Color        Icon Badge BG (light)     Icon Badge BG (dark)
────────────  ──────────────────  ────────────────────────  ──────────────────────
CPU / System  #6366F1 (indigo)    #EEF2FF                   #312E81
Temperature   #F59E0B (amber)     #FFFBEB                   #78350F
Memory        #8B5CF6 (violet)    #F5F3FF                   #4C1D95
Disk          #06B6D4 (cyan)      #ECFEFF                   #164E63
Wi-Fi         #3B82F6 (blue)      #EFF6FF                   #1E3A5F
Bluetooth     #6366F1 (indigo)    #EEF2FF                   #312E81
Audio         #EC4899 (pink)      #FDF2F8                   #831843
Camera        #10B981 (emerald)   #ECFDF5                   #064E3B
Storage/SSD   #06B6D4 (cyan)      #ECFEFF                   #164E63
Settings      #64748B (slate)     #F1F5F9                   #334155
```

### 6.3 Typography Scale

Use the existing Space Grotesk font. Add semantic size aliases:

```
Name          Size    Weight        Usage
────────────  ──────  ────────────  ──────────────────────────────
screenTitle   24px    Bold          Screen titles (Dashboard, Wi-Fi...)
sectionTitle  18px    SemiBold      Section headings inside screens
cardTitle     16px    SemiBold      Card headings
body          14px    Regular       General text, descriptions
caption       12px    Regular       Timestamps, secondary info
stat          32px    Bold          Large stat numbers (CPU 45%)
statUnit      14px    Medium        Units next to stats (%, °C, MB)
```

### 6.8 Styling Rules (mandatory for all screens)

> AI must follow these rules when building any screen. These rules prevent the "flat monotone"
> look and ensure a professional, visually rich UI.

#### 6.8.1 Spacing & Gaps

- **Screen padding:** `md` (16px) on all sides.
- **Section gap:** `lg` (24px) vertical gap between sections (e.g., between stats grid and network card).
- **Grid gap:** `sm` (12px) both horizontal and vertical between grid items. Use `gap` property on the container, NOT `marginBottom` alone on children. If `gap` is unsupported, use `marginBottom: sm` on items AND `columnGap: sm` or padding-based approach.
- **Card internal padding:** `md` (16px) on all sides.
- **List item spacing:** `sm` (12px) gap between list items. Never stack items with 0 gap.
- **Button row gap:** `sm` (12px) between side-by-side buttons.

#### 6.8.2 Card Styling

Every card must have:
- `backgroundColor`: `surface` token (white in light, #1E293B in dark)
- `borderRadius`: `md` (16px)
- `borderWidth`: 1, `borderColor`: `border` token
- `shadowColor`: dark in light mode, none in dark mode
- `shadowOffset`: { width: 0, height: 2 }, `shadowOpacity`: 0.06, `shadowRadius`: 8
- `padding`: `md` (16px)

Do NOT use the default Ignite Card component borders (they are too heavy). Override card styles
to match these lighter, modern borders.

#### 6.8.3 Icon Badges (colored icon containers)

Icons in cards and list items must NOT be bare icons floating in space.
They must sit inside a **colored badge container**:

```typescript
// Example: StatCard icon badge
const $iconBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#EEF2FF",  // from feature accent table — light icon badge bg
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.xs,
})
// The icon itself is rendered inside this badge, with the feature accent color as tint.
```

Rules:
- Badge size: 40x40 for stat cards, 48x48 for feature cards, 36x36 for list items
- Badge borderRadius: 12
- Badge background: the light/dark "Icon Badge BG" color from the feature accent table
- Icon color: the feature's accent color (e.g., indigo for CPU, amber for temperature)
- This applies to: StatCard icons, FeatureCard icons, list item left icons

#### 6.8.4 Progress Bar Colors

Progress bars must use **color based on the value being shown**, not a single default color:

- CPU usage: indigo (#6366F1), shifts to amber >70%, red >90%
- Temperature: green (#10B981) <60°C, amber (#F59E0B) 60-75°C, red (#EF4444) >75°C
- Memory: violet (#8B5CF6), shifts to amber >70%, red >90%
- Disk: cyan (#06B6D4), shifts to amber >70%, red >90%
- Wi-Fi signal: green >70%, amber 40-70%, red <40%

Progress bar track (background): `border` token color. Progress bar height: 6px. Border radius: 3px.

#### 6.8.5 Stat Values

Large stat numbers (e.g., "45%", "52°C") must be visually prominent:
- Font size: 28-32px, weight: Bold
- Color: `text` token (primary), NOT dimmed
- Unit text (%, °C, GB): smaller (14px), `textDim` color, placed next to the value with `xxs` gap

#### 6.8.6 Section Headers

Section titles (e.g., "Network", "Connected Devices") must have:
- Weight: SemiBold, size: 16-18px
- Color: `text` token
- `marginBottom: sm` (12px) below the title before content
- Optional right-side action (e.g., "Scan" button) aligned to the right of the same row

#### 6.8.7 List Items

List items (Wi-Fi networks, Bluetooth devices, settings rows) must have:
- `paddingVertical: sm` (12px) — gives breathing room
- `paddingHorizontal: md` (16px)
- Separator line between items: 1px, `border` token color, with `marginLeft` to align past the icon
- Left icon in a colored badge (see 6.8.3)
- Right side: value text or chevron icon in `textDim` color
- Touch feedback: subtle background color change on press (use `Pressable` with `pressed` state → `surfaceElevated` background)

#### 6.8.8 FeatureCard (Control Menu Grid)

Each feature card in the Control Menu must feel tappable and visually distinct:
- Height: ~120px
- Top section: large colored icon badge (48x48, using feature accent color)
- Below icon: feature name in `cardTitle` weight
- Below name: status subtitle in `caption` size, `textDim` color
- Left colored accent bar: 4px wide vertical bar on the left edge of the card, using the feature's accent color. This makes each card visually unique even at a glance.
- On press: scale to 0.97 + subtle shadow increase

#### 6.8.9 Empty & Loading States

- **Loading:** Use `SkeletonLoader` with subtle shimmer animation. Skeleton shapes must match the final layout (rounded rect for cards, circles for icons, thin rects for text lines).
- **Empty:** Center an icon + message vertically. Icon: 64px, `textDim` color. Text below: `body` size, `textDim`.

#### 6.8.10 Color Temperature Rule

Never have a screen that is only gray/white/black. Every screen must have at least:
- 1 accent-colored element (icon badge, progress bar, or status badge)
- Status indicators in semantic color (green/amber/red)
- The screen's feature accent color visible somewhere

This prevents the "monotone dashboard" problem.

### 6.4 Screen Layouts

#### 6.4.1 Dashboard Screen

**File:** `app/screens/WelcomeScreen.tsx` — rename to `DashboardScreen.tsx` (or rewrite in place).
The existing `WelcomeScreen` is the default landing screen in the navigator; reuse it as the
Dashboard instead of creating a new file. Update the route name from `"Welcome"` to `"Dashboard"`
in `AppNavigator.tsx` and `navigationTypes.ts`.

**Preset:** `scroll` (vertical scroll, pull-to-refresh enabled)

**Header area:**
- Thin custom header (not navigation header), height 48px
- Left: `ConnectionBadge` showing socket status (green dot + "Connected" / red dot + "Offline")
  - The badge uses `success` / `error` color tokens — always colorful, not gray
- Center: app title "Pi Manager" in `cardTitle` weight
- Right: settings gear icon (in `textDim` color), navigates to SettingsScreen

**Body — stats grid (2 columns, gap `sm` = 12px):**

Each `StatCard` follows section 6.8 styling rules strictly:
- Card has `surface` background, `border` token border (1px), borderRadius 16, padding `md`
- Top-left: **colored icon badge** (40x40, borderRadius 12, background from feature accent table)
  - CPU icon badge: bg #EEF2FF dark:#312E81, icon color #6366F1 dark:#818CF8
  - Temperature icon badge: bg #FFFBEB dark:#78350F, icon color #F59E0B dark:#FBBF24
  - Memory icon badge: bg #F5F3FF dark:#4C1D95, icon color #8B5CF6 dark:#A78BFA
  - Disk icon badge: bg #ECFEFF dark:#164E63, icon color #06B6D4 dark:#22D3EE
- Top-right: label text in `textDim`
- Center: stat value in 28px Bold (e.g., "45%"), `text` color — NOT dimmed
- Bottom: **colored progress bar** matching the feature accent (see 6.8.4 for threshold color shifts)
- Below progress bar: caption in 12px `textDim` (e.g., "Cortex-A72", "System Thermal")

Row 1: CPU card | Temperature card
Row 2: Memory card | Disk card
Gap between rows AND columns: `sm` (12px). Use `gap: 12` on the grid container.

**Section gap: `lg` (24px) between stats grid and next section.**

**Body — network card (full-width):**
- `SectionHeader` title "Network" with `sectionTitle` styling
- `Card` with `surface` background, borderRadius 16
- Each network interface is a row with:
  - Left: colored badge (36x36, blue bg #EFF6FF dark:#1E3A5F) with network icon (#3B82F6 dark:#60A5FA)
  - Center: interface name bold (wlan0, eth0) + IP address in `textDim` below
  - Right: colored status dot — `success` green if up, `error` red if down
- Rows separated by 1px `border` color divider
- Interfaces with no IP show "Not connected" in `textDim` + red dot

**Section gap: `lg` (24px) before device info.**

**Body — device info card (full-width):**
- `SectionHeader` title "Device Info"
- `Card` with `surface` background
- Key-value rows: Hostname, OS, Kernel, Uptime (formatted as "3d 14h 22m")
- Keys in `textDim`, values in `text` color, aligned right
- Icon badge on left: slate colored (bg #F1F5F9 dark:#334155, icon #64748B)

**Loading state:** All StatCards show `SkeletonLoader` with shimmer animation until first `system:stats` event. Skeleton shapes match the final layout: rounded rect for icon badge, thin rect for label, large rect for value, thin rect for progress bar.

**Components used:** `StatCard`, `ConnectionBadge`, `ProgressBar`, `SkeletonLoader`, `Card`, `SectionHeader`

#### 6.4.2 Control Menu Screen

**Preset:** `scroll` (scrollable when menu items grow beyond viewport)

**Header:** Standard `Header` component, title "Control"

**Data-driven design:** The menu is rendered from a `MENU_ITEMS` array. Adding a new feature
to the menu requires only adding an entry to this array — no layout or component changes needed.

```typescript
// app/screens/ControlMenuScreen.tsx

import type { IconTypes } from "@/components/Icon"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import type { TxKeyPath } from "@/i18n"

interface MenuItem {
  id: string                                   // unique key
  tx: TxKeyPath                                // i18n label, e.g. "controlMenu:wifi"
  icon: IconTypes                              // icon name from Icon component
  screen: keyof AppStackParamList              // navigate target
  accent: string                               // feature accent color (from 6.2 table)
  accentBgLight: string                        // icon badge bg for light mode
  accentBgDark: string                         // icon badge bg for dark mode
  subtitle?: () => string                      // dynamic subtitle (hook result, live status)
  danger?: boolean                             // true = red styling, overrides accent with error
  confirmTx?: TxKeyPath                        // confirm dialog message (required if danger)
  socketEvent?: string                         // if set, emit this event instead of navigating
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "wifi",
    tx: "controlMenu:wifi",
    icon: "wifi",
    screen: "Wifi",
    accent: "#3B82F6",
    accentBgLight: "#EFF6FF",
    accentBgDark: "#1E3A5F",
  },
  {
    id: "bluetooth",
    tx: "controlMenu:bluetooth",
    icon: "bluetooth",
    screen: "Bluetooth",
    accent: "#6366F1",
    accentBgLight: "#EEF2FF",
    accentBgDark: "#312E81",
  },
  {
    id: "audio",
    tx: "controlMenu:audio",
    icon: "speaker",
    screen: "Audio",
    accent: "#EC4899",
    accentBgLight: "#FDF2F8",
    accentBgDark: "#831843",
  },
  {
    id: "camera",
    tx: "controlMenu:camera",
    icon: "camera",
    screen: "Camera",
    accent: "#10B981",
    accentBgLight: "#ECFDF5",
    accentBgDark: "#064E3B",
  },
  {
    id: "storage",
    tx: "controlMenu:storage",
    icon: "harddisk",
    screen: "Storage",
    accent: "#06B6D4",
    accentBgLight: "#ECFEFF",
    accentBgDark: "#164E63",
  },
  {
    id: "reboot",
    tx: "controlMenu:reboot",
    icon: "reload",
    screen: "Dashboard",
    accent: "#EF4444",
    accentBgLight: "#FEF2F2",
    accentBgDark: "#7F1D1D",
    danger: true,
    confirmTx: "controlMenu:rebootConfirm",
    socketEvent: "system:reboot",
  },
  // Adding a new menu item: just append here.
  // Example — GPIO control (future):
  // {
  //   id: "gpio",
  //   tx: "controlMenu:gpio",
  //   icon: "chip",
  //   screen: "Gpio",
  //   accent: "#F59E0B",
  //   accentBgLight: "#FFFBEB",
  //   accentBgDark: "#78350F",
  // },
]
```

**Rendering:** `FlatList` with `numColumns={2}`, gap `sm` (12px) between items. Screen padding `md`.

Each `FeatureCard` must follow section 6.8.8:
- Card: `surface` bg, borderRadius 16, padding `md`, height ~120px
- **Left accent bar:** 4px wide, feature accent color, runs the full height of the card
- **Icon badge:** 48x48, borderRadius 12, feature accent bg from 6.2 table, icon in feature accent color
- **Title:** `cardTitle` weight (16px SemiBold)
- **Subtitle:** `caption` size (12px), `textDim` — shows live status from `useMenuSubtitles()`
- **Touch feedback:** scale 0.97 animation on press

Each `MenuItem` also carries an `accent` field (color string from the feature accent table in 6.2).
This accent is passed to `FeatureCard` for badge bg and left bar rendering.

Items with `danger: true` render full-width below the grid as a separate section, styled with
`error` color accent bar, `error` colored icon badge bg (#FEF2F2 dark:#7F1D1D), `error` icon tint.

**Subtitle logic:** Each card shows a live subtitle (e.g. current SSID, volume %).
Subtitles come from a `useMenuSubtitles()` hook that subscribes to the relevant socket
modules and returns a `Record<string, string>` keyed by `MenuItem.id`.

```typescript
// app/hooks/useMenuSubtitles.ts
export function useMenuSubtitles(): Record<string, string> {
  const wifiStatus = useWifiStatus()       // from wifi socket module
  const btStatus = useBluetoothStatus()    // from bluetooth socket module
  const audioState = useAudioState()       // from audio socket module
  const cameraState = useCameraState()     // from camera socket module
  const storageHealth = useStorageHealth() // from storage socket module

  return {
    wifi: wifiStatus?.ssid ?? "Disconnected",
    bluetooth: btStatus?.connectedDevices.length
      ? `${btStatus.connectedDevices.length} connected`
      : "Off",
    audio: audioState?.muted ? "Muted" : `Vol: ${audioState?.volume ?? 0}%`,
    camera: cameraState?.streaming ? "Streaming" : "Offline",
    storage: `Wear: ${storageHealth?.percentageUsed ?? 0}%`,
  }
}
```

**Tap behavior:**
- Normal item: `navigation.navigate(item.screen)`
- Danger item: show `ConfirmDialog` with `item.confirmTx` message → on confirm, emit `item.socketEvent`

**Components used:** `FeatureCard` (new), `ConfirmDialog` (new), `FlatList`

#### 6.4.3 Wi-Fi Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Wi-Fi"

**Section 1 — Current Connection (full-width Card, only visible when connected):**
- SSID name in `cardTitle` weight
- Key-value rows: IP address, Signal (ProgressBar + percentage), Speed
- `Button` "Disconnect" at bottom-right of card, preset "default"

**Section 2 — Available Networks:**
- `SectionHeader` title "Available Networks", right action: "Scan" button (triggers `wifi:scan` event, shows loading spinner while scanning)
- Flat list of `NetworkListItem` components, each showing:
  - Left: signal strength icon (4 bars, filled proportional to signal %)
  - Center: SSID name
  - Right: lock icon if security is not "Open"
- On tap: opens `BottomSheet` with:
  - Network name as title
  - `TextField` for password (hidden if network is Open)
  - `Button` "Connect" (preset "filled")
  - Shows inline error message on `wifi:connect_result` failure

**Empty state:** If no networks found after scan, show `EmptyState` "No networks found. Try scanning again."

**Components used:** `Card`, `SectionHeader` (new), `NetworkListItem` (new), `BottomSheet` (new), `ProgressBar`, `TextField`, `Button`, `EmptyState`

#### 6.4.4 Bluetooth Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Bluetooth", right action: power `Switch` toggle (emits bluetooth on/off)

**Section 1 — Connected Devices (visible only when devices are connected):**
- `SectionHeader` title "Connected Devices"
- List of `DeviceListItem`, each showing:
  - Left: type-based icon (headphones for audio, keyboard for input, display for display, question mark for unknown)
  - Center: device name (or MAC if name is null)
  - Right: checkmark icon (paired) + connected status badge
- On tap: shows action sheet with "Disconnect" and "Unpair" options

**Section 2 — Available Devices:**
- `SectionHeader` title "Available Devices", right action: "Scan" button (toggles `bluetooth:scan` / `bluetooth:stop_scan`)
- While scanning: show a subtle pulsing animation on the Scan button
- List of `DeviceListItem`, each showing:
  - Left: type-based icon
  - Center: device name or MAC
  - Right: RSSI value in dBm (e.g., "-42 dBm"), color-coded (strong > -50: green, medium -50 to -70: amber, weak < -70: red)
- On tap: shows `ConfirmDialog` "Pair with {name}?" → on confirm emits `bluetooth:pair`
- If device requires PIN: follow up with a `BottomSheet` containing a `TextField` for PIN input

**Disabled state:** When Bluetooth power is off, show overlay message "Bluetooth is turned off" with the toggle to turn it on.

**Components used:** `DeviceListItem` (new), `SectionHeader`, `Switch` (existing Toggle), `ConfirmDialog`, `BottomSheet`

#### 6.4.5 Audio Screen

**Preset:** `fixed`

**Header:** `Header` with back arrow, title "Audio"

**Section 1 — Volume Control (full-width Card):**
- Card heading: "Volume"
- `VolumeSlider` — large horizontal slider (thumb size 28px, track height 6px)
  - Left end: muted speaker icon
  - Right end: loud speaker icon
  - Below slider: current percentage in `stat` size (e.g., "72%")
  - Dragging emits `audio:set_volume` with debounce (200ms) to avoid flooding
- `Button` "Mute" / "Unmute" below, toggles `audio:toggle_mute`
- When muted: slider track turns gray, percentage shows "Muted" text, mute button changes label

**Section 2 — Output Device (full-width Card):**
- Card heading: "Output Device"
- Radio button list using `Radio` component (existing Toggle/Radio):
  - Each option shows: device type icon + device name (e.g., "HDMI", "3.5mm Jack", "JBL Flip 6 (Bluetooth)")
  - Selected item has filled radio indicator
  - On select: emits `audio:set_output` with device id

**Section 3 — Test Sound (full-width):**
- `Button` preset "filled": "Test Sound"
- On press: emits `audio:test_sound`, button shows brief loading state

**Components used:** `VolumeSlider` (new), `Radio` (existing), `Card`, `Button`

#### 6.4.6 Camera Screen

**Preset:** `fixed`

**Header:** `Header` with back arrow, title "Camera", right action: segmented control for resolution ("480p" | "720p" | "1080p"), default "720p"

**Body — video area:**
- `VideoPlayer` component, takes full width with 16:9 aspect ratio
- When not streaming: shows dark placeholder with camera-off icon centered and text "Camera is off"
- When streaming: shows live WebRTC video feed
- When connecting: shows loading spinner overlay

**Body — action buttons (row layout, gap `md`, below video):**
- `Button` "Snapshot" (preset "default", icon: camera) — emits `camera:snapshot`, disabled when not streaming
- `Button` "Start" / "Stop" (preset "filled" when start, "reversed" when stop) — toggles `camera:start` / `camera:stop`

**Body — status bar (bottom of screen):**
- Single line of `caption` text showing: resolution, FPS, bitrate (e.g., "720p @ 24fps | 2.1 Mbps")
- Only visible when streaming

**WebRTC flow on "Start" press:**
1. Client emits `camera:start` with resolution
2. Server starts libcamera, creates WebRTC offer, emits `camera:offer`
3. Client receives offer, creates answer, emits `camera:answer`
4. ICE candidates exchanged via `camera:ice_candidate` (bidirectional)
5. Stream established, rendered in VideoPlayer

**Components used:** `VideoPlayer` (new), `Button`, `Header`

#### 6.4.7 Storage / SSD Health Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Storage Health", right action: refresh icon button
(emits `storage:refresh`, shows brief spin animation while fetching).

**Section 1 — Health Overview (full-width Card, prominent):**
- Top row: large colored **health status badge**
  - "Healthy" → `success` green bg (#ECFDF5 dark:#064E3B), green text, checkmark icon
  - "Warning" → `warning` amber bg (#FFFBEB dark:#78350F), amber text, alert-triangle icon
  - "Critical" → `error` red bg (#FEF2F2 dark:#7F1D1D), red text, alert-circle icon
  - Status is derived from `percentageUsed`: <80% = Healthy, 80-95% = Warning, >95% = Critical
- Below badge: drive model name in `cardTitle` weight (e.g., "Samsung 970 EVO Plus 250GB")
- Below model: drive type label in `caption`, `textDim` (e.g., "NVMe SSD")

**Section 2 — Key Metrics (2-column grid, gap `sm`):**
Four `StatCard`-style metric cards, each with colored icon badge:

- **Lifespan Used** — icon: heart-pulse (cyan badge #ECFEFF dark:#164E63, icon #06B6D4)
  - Value: "12%" (from `percentageUsed`), progress bar (cyan → amber >70% → red >90%)
  - Caption: "Estimated lifespan remaining"

- **Temperature** — icon: thermometer (amber badge #FFFBEB dark:#78350F, icon #F59E0B)
  - Value: "38°C" (from `temperature`)
  - Progress bar: green <50°C, amber 50-70°C, red >70°C
  - Caption: "Drive thermal"

- **Total Written** — icon: arrow-down-circle (violet badge #F5F3FF dark:#4C1D95, icon #8B5CF6)
  - Value: "2.4 TB" (calculated from `dataUnitsWritten × 512000 / 1e12`)
  - Caption: "Lifetime writes"

- **Power On** — icon: clock (blue badge #EFF6FF dark:#1E3A5F, icon #3B82F6)
  - Value: "1,247 hrs" (from `powerOnHours`, formatted with comma separator)
  - Caption: "Total runtime"

**Section 3 — Drive Details (full-width Card):**
Key-value list with `sm` gap between rows:
- **Device:** `/dev/nvme0n1` — `textDim` key, `text` value
- **Serial:** `S4EWNX0M...` — truncated with "..." if long, tap to copy full serial
- **Firmware:** `2B2QEXM7`
- **Interface:** `NVMe`
- **Capacity:** `232.9 GB` (formatted from `size`)
- **Used Space:** `89.2 / 232.9 GB` (from disk usage, with small progress bar inline)

Each row has a thin `border` separator line between items. Keys are `textDim`, values are `text`.

**Section 4 — S.M.A.R.T. Details (full-width Card, collapsible):**
- Card heading: "S.M.A.R.T. Data" with chevron toggle (collapsed by default)
- When expanded: key-value list of NVMe smart-log attributes:
  - Each row: attribute name (left, `body` weight) + raw value (right, monospace font)
  - Rows with abnormal values highlighted with `warning` or `error` left border (4px):
    - `mediaErrors > 0` → `error`
    - `unsafeShutdowns > 10` → `warning`
    - `availableSpare < availableSpareThreshold` → `error`
    - `criticalWarning > 0` → `error`
  - Attributes shown: Available Spare, Available Spare Threshold, Media Errors,
    Unsafe Shutdowns, Error Log Entries, Critical Warning, Data Units Read, Data Units Written

**Section 5 — Disk Partitions (full-width Card):**
- Card heading: "Partitions"
- List of mounted partitions, each row:
  - Left: folder icon in slate badge (36x36)
  - Center: mount point (`/`, `/boot`, `/media/usb0`) in `body` weight, filesystem type below in `caption`
  - Right: usage bar (thin, 80px wide) + "89.2 GB / 232.9 GB" in `caption`
  - Usage bar color: cyan, shifts to amber >70%, red >90%

**Loading state:** Skeleton loaders matching each section shape. Health badge → rounded rect,
stat cards → 2x2 skeleton grid, details → key-value skeleton rows.

**Components used:** `StatCard`, `ProgressBar`, `Card`, `SectionHeader`, `Header`, `IconBadge`

#### 6.4.8 Settings Screen

**Preset:** `scroll`

**Header:** Standard tab header, title "Settings"

**Section 1 — Appearance (Card):**
- Row: "Theme" label + dropdown/picker (options: "System", "Light", "Dark"), uses existing `setThemeContextOverride`
- Row: "Language" label + dropdown/picker (options: based on available i18n locales)

**Section 2 — Connection (Card):**
- Row: "Server URL" label + value (from env config)
- Row: "Status" label + `ConnectionBadge`
- Row: "Latency" label + value in ms (measured from socket ping/pong)

**Section 3 — About (Card):**
- Row: "App Version" + value from app config
- Row: "Server Version" + value received via socket on connect
- Row: "Telegram ID" + value from auth context (username or ID)

**Components used:** `Card`, `ConnectionBadge`, existing theme/i18n utilities

#### 6.4.9 Access Denied Screen

**When shown:** After `connect_error` with message `"ACCESS_DENIED"` (user not in whitelist).

**Layout:**
- Centered vertically on screen
- Lock icon (large, `error` color)
- Title: "Access Denied" in `screenTitle` weight
- Body text: "Your Telegram account is not authorized to use this app. Contact the device owner to request access." in `body` weight, `textDim` color
- Below: show the user's Telegram ID in `caption` for reference (so they can share it with the admin)
- `Button` "Try Again" (preset "default") → re-attempts socket connection with same initData

**No navigation:** This screen replaces the entire app. No tabs, no header, no back button.

### 6.5 Component Library (new components to build)

All components follow project conventions: `$` prefix styles, `themed()` for dynamic styles,
`ThemedStyle<T>` functions, exported as named functions, no default exports.

| Component | Props | Description |
|-----------|-------|-------------|
| `StatCard` | `title`, `value`, `unit?`, `progress?`, `icon?`, `caption?` | Dashboard metric card with progress bar |
| `FeatureCard` | `title`, `subtitle`, `icon`, `onPress`, `status?` | Control menu grid item |
| `ConnectionBadge` | `status: "connected" \| "connecting" \| "disconnected" \| "error"` | Colored dot + label |
| `ProgressBar` | `value: number`, `color?`, `height?` | Thin horizontal progress |
| `SectionHeader` | `title`, `rightAction?` | Section label with optional action button |
| `NetworkListItem` | `network: WifiNetwork`, `onPress` | Wi-Fi network row with signal icon |
| `DeviceListItem` | `device: BluetoothDevice`, `onPress` | Bluetooth device row |
| `VolumeSlider` | `value`, `onValueChange`, `muted` | Large-thumb slider with mute |
| `VideoPlayer` | `streamUrl?`, `isStreaming` | WebRTC video container |
| `SkeletonLoader` | `width`, `height`, `borderRadius` | Animated placeholder while loading |
| `BottomSheet` | `visible`, `onDismiss`, `children` | Slide-up modal for forms |
| `ConfirmDialog` | `title`, `message`, `onConfirm`, `onCancel` | Confirmation alert |

### 6.6 Animation & Micro-interactions

- **Skeleton loading**: shimmer effect on StatCards while waiting for first `system:stats` event.
- **Value transitions**: numbers animate from old→new (e.g. CPU 42%→47%) using `react-native-reanimated` shared values.
- **Connection banner**: slides down from top when disconnected, slides up when reconnected.
- **Tab switch**: cross-fade transition between screens.
- **Pull-to-refresh**: on Dashboard and list screens.
- **Card press**: subtle scale-down (0.97) on touch.

### 6.7 Responsive Layout

```
Width < 400px (Telegram Mini App):
  - 2-column grid for StatCards
  - Full-width cards for lists
  - Bottom sheet instead of modal dialogs

Width 400–768px (tablet):
  - 3-column grid for StatCards
  - Side-by-side cards where appropriate

Width > 768px (desktop):
  - Sidebar navigation instead of bottom tabs
  - Dashboard uses 4-column grid
```

---

## 7. Navigation Structure

```
AppStack (NativeStack, headerShown: false)
│
├── TelegramAuth                        # Validates initData, auto-redirects on success
├── AccessDenied                        # Shown when user ID not in whitelist
│
└── MainTabs (BottomTab)
    │
    ├── DashboardTab (NativeStack)
    │   └── DashboardScreen             # System stats overview
    │
    ├── ControlTab (NativeStack)
    │   ├── ControlMenuScreen           # Feature grid (Wi-Fi, BT, Audio, Camera, Storage)
    │   ├── WifiScreen                  # Wi-Fi management
    │   ├── BluetoothScreen             # Bluetooth management
    │   ├── AudioScreen                 # Audio control
    │   ├── CameraScreen                # WebRTC live view
    │   └── StorageScreen               # SSD health & S.M.A.R.T. data
    │
    └── SettingsTab (NativeStack)
        └── SettingsScreen              # Theme, language, connection info
```

### Tab Bar Configuration

- Height: 60px (includes safe area)
- Icons: custom SVG icons from `assets/icons/`
- Active color: `tint` (indigo)
- Inactive color: `textDim`
- Background: `surface`
- Badge on Control tab: shows count of connected BT devices (optional)

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
| node-wifi or child_process+nmcli | Wi-Fi management |
| child_process (bluetoothctl) | Bluetooth management |
| child_process (amixer/pactl) | Audio control |
| wrtc or werift | WebRTC for camera |
| dotenv | Environment variables |
| zod | Runtime type validation |

### Infrastructure

| Tool | Purpose |
|------|---------|
| cloudflared | HTTPS tunnel |
| Telegram Bot API | Bot + Mini App |
| systemd | Auto-start on boot |
| pm2 | Process manager for server |

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

## 11. Current State

- Scaffolded with Ignite CLI (Infinite Red boilerplate)
- `WelcomeScreen` is the only active screen — will be reused as the **DashboardScreen** (rename + rewrite content, keep the file as the navigator's initial route)
- No backend exists yet
- No Socket.IO integration yet
- No Telegram integration yet
- Existing components: Button, Text, TextField, Card, Header, Icon, ListItem, Screen, Toggle
- Theme system: light/dark mode, Space Grotesk font, spacing tokens, `themed()` helper

---

## 12. Development Roadmap

### Phase 0 — Theme Foundation (do this FIRST, before any UI work)

> **Why first?** Every component uses `themed()` and reads from `colors.*` tokens.
> If the palette stays as Ignite defaults (warm beige/brown), all UI will look dull
> regardless of how well the screens are designed. This phase takes ~30 minutes
> but transforms the entire visual identity of the app.

- [ ] **Redesign `app/theme/colors.ts`** (light mode) — replace Ignite palette with Pi Manager palette
- [ ] **Redesign `app/theme/colorsDark.ts`** (dark mode) — modern dark IoT palette
- [ ] **Add new semantic tokens** to both files: `surface`, `surfaceElevated`, `success`, `warning`, `info`, `tintDim`
- [ ] **Add feature accent map** export for components to reference per-feature colors
- [ ] Verify both files export the same shape (required by `types.ts`: `Colors = typeof colorsLight | typeof colorsDark`)

**Files to change:**
- `app/theme/colors.ts` — full rewrite of palette + semantic tokens
- `app/theme/colorsDark.ts` — full rewrite of palette + semantic tokens

**Exact target values (copy-paste ready):**

`app/theme/colors.ts` (light mode):
```typescript
const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F8FAFC",
  neutral300: "#F1F5F9",
  neutral400: "#E2E8F0",
  neutral500: "#94A3B8",
  neutral600: "#64748B",
  neutral700: "#475569",
  neutral800: "#1E293B",
  neutral900: "#0F172A",

  primary100: "#E0E7FF",
  primary200: "#C7D2FE",
  primary300: "#A5B4FC",
  primary400: "#818CF8",
  primary500: "#6366F1",
  primary600: "#4F46E5",

  secondary100: "#DBEAFE",
  secondary200: "#BFDBFE",
  secondary300: "#93C5FD",
  secondary400: "#60A5FA",
  secondary500: "#3B82F6",

  accent100: "#ECFDF5",
  accent200: "#D1FAE5",
  accent300: "#6EE7B7",
  accent400: "#34D399",
  accent500: "#10B981",

  angry100: "#FEF2F2",
  angry500: "#EF4444",

  overlay20: "rgba(15, 23, 42, 0.2)",
  overlay50: "rgba(15, 23, 42, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: "#F0F2F5",
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral400,
  tintDim: palette.primary300,
  separator: palette.neutral400,
  error: palette.angry500,
  errorBackground: palette.angry100,
  surface: palette.neutral100,
  surfaceElevated: palette.neutral100,
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
} as const
```

`app/theme/colorsDark.ts` (dark mode):
```typescript
const palette = {
  neutral100: "#0F172A",
  neutral200: "#1E293B",
  neutral300: "#334155",
  neutral400: "#475569",
  neutral500: "#64748B",
  neutral600: "#94A3B8",
  neutral700: "#CBD5E1",
  neutral800: "#F1F5F9",
  neutral900: "#FFFFFF",

  primary100: "#312E81",
  primary200: "#3730A3",
  primary300: "#4F46E5",
  primary400: "#6366F1",
  primary500: "#818CF8",
  primary600: "#A5B4FC",

  secondary100: "#1E3A5F",
  secondary200: "#1E40AF",
  secondary300: "#3B82F6",
  secondary400: "#60A5FA",
  secondary500: "#93C5FD",

  accent100: "#064E3B",
  accent200: "#065F46",
  accent300: "#10B981",
  accent400: "#34D399",
  accent500: "#6EE7B7",

  angry100: "#7F1D1D",
  angry500: "#F87171",

  overlay20: "rgba(0, 0, 0, 0.2)",
  overlay50: "rgba(0, 0, 0, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: "#F1F5F9",
  textDim: "#94A3B8",
  background: "#0F172A",
  border: "#334155",
  tint: "#818CF8",
  tintInactive: "#475569",
  tintDim: "#6366F180",
  separator: "#334155",
  error: "#F87171",
  errorBackground: "#7F1D1D",
  surface: "#1E293B",
  surfaceElevated: "#334155",
  success: "#34D399",
  warning: "#FBBF24",
  info: "#60A5FA",
} as const
```

**Feature accent map** (add as new file `app/theme/featureColors.ts`):
```typescript
export const featureColors = {
  cpu:         { accent: "#6366F1", badgeLight: "#EEF2FF", badgeDark: "#312E81" },
  temperature: { accent: "#F59E0B", badgeLight: "#FFFBEB", badgeDark: "#78350F" },
  memory:      { accent: "#8B5CF6", badgeLight: "#F5F3FF", badgeDark: "#4C1D95" },
  disk:        { accent: "#06B6D4", badgeLight: "#ECFEFF", badgeDark: "#164E63" },
  wifi:        { accent: "#3B82F6", badgeLight: "#EFF6FF", badgeDark: "#1E3A5F" },
  bluetooth:   { accent: "#6366F1", badgeLight: "#EEF2FF", badgeDark: "#312E81" },
  audio:       { accent: "#EC4899", badgeLight: "#FDF2F8", badgeDark: "#831843" },
  camera:      { accent: "#10B981", badgeLight: "#ECFDF5", badgeDark: "#064E3B" },
  storage:     { accent: "#06B6D4", badgeLight: "#ECFEFF", badgeDark: "#164E63" },
  settings:    { accent: "#64748B", badgeLight: "#F1F5F9", badgeDark: "#334155" },
  system:      { accent: "#6366F1", badgeLight: "#EEF2FF", badgeDark: "#312E81" },
} as const

export type FeatureKey = keyof typeof featureColors
```

Usage in components:
```typescript
import { featureColors } from "@/theme/featureColors"
import { useAppTheme } from "@/theme/context"

// Inside component:
const { theme } = useAppTheme()
const cpu = featureColors.cpu
const badgeBg = theme.isDark ? cpu.badgeDark : cpu.badgeLight
// badgeBg → "#EEF2FF" (light) or "#312E81" (dark)
// cpu.accent → "#6366F1" (icon tint color, same in both modes)
```

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

  // Wi-Fi
  "wifi:networks": (data: WifiNetwork[]) => void
  "wifi:status": (data: WifiStatus) => void
  "wifi:connect_result": (data: { success: boolean; error?: string }) => void

  // Bluetooth
  "bluetooth:devices": (data: BluetoothDevice[]) => void
  "bluetooth:status": (data: BluetoothStatus) => void
  "bluetooth:pair_result": (data: { mac: string; success: boolean; error?: string }) => void

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
