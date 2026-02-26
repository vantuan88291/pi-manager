# Socket Architecture

> Split backend docs (Socket Architecture).

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
  autoConnect: false, // manual connect after auth
  reconnection: true,
  reconnectionAttempts: Infinity, // never give up
  reconnectionDelay: 1000, // start at 1s
  reconnectionDelayMax: 30000, // cap at 30s
  timeout: 10000, // connection timeout
  transports: ["websocket"], // skip polling, go straight to WS
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
      this.socket.auth = this.sessionToken ? { sessionToken: this.sessionToken } : { initData: this.initData }
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
  socket.data.sessionToken = token // sent to client in "auth:success"
  next()
})
```

**Session storage:** Simple `Map<string, Session>` in server memory. Sessions are cleaned up
periodically (every 10 min, remove entries older than TTL). No database needed — if the server
restarts, all sessions are lost and clients re-auth with initData (which is fine).

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
audio:set_output                    camera:snapshot_result  (data payload; exception below)
camera:start                        error  (global error channel)
camera:stop
camera:snapshot
storage:refresh                     storage:health

(Auth is NOT in the event table — it uses Socket.IO
handshake + connect_error, not custom events. See 4.1.)
**Command responses:** Ack-only for state-change commands (see 5.1). No `*_result` events for wifi/bluetooth/audio/system — use ack + status events. **Exception:** `camera:snapshot` returns image data via push event `camera:snapshot_result` (base64 payload too large for ack).
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

