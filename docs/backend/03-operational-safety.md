# Operational Safety

> Split backend docs (Operational Safety).

## 5. Operational Safety

### 5.1 Command Acknowledgement & Timeout

**Chosen approach: ack-only for command state-change.** All state-changing commands use the Socket.IO ack callback:
client sends `socket.emit(event, payload, (err, data) => { ... })`; server calls the ack once with
`(null, result)` on success or `(errorObject)` on failure. There are **no** `*_result` events for those commands
(e.g. no `wifi:connect_result`, no `bluetooth:pair_result`). For async commands (e.g. wifi:connect, bluetooth:pair),
server may call ack with `{ accepted: true }` when the operation is started, then the client relies on
**status events** (`wifi:status`, `bluetooth:status`) for the final outcome.

**Exception — data-heavy response:** `camera:snapshot` returns the image via push event **`camera:snapshot_result`**
(payload: `{ base64, timestamp }`), not via ack, because the base64 payload is too large for ack. Client should still
use ack for `camera:snapshot` to get immediate success/error (e.g. "capture started" or "camera busy"); the actual
image is delivered asynchronously on `camera:snapshot_result`. Alternatively, server may ack with
`(null, { accepted: true })` and only emit `camera:snapshot_result` with the data — either way, the spec keeps one
push event for the image data.

The client must handle both success and timeout (ack not called within T ms = timeout).

```typescript
// Client helper — typed emit with ack + timeout (idiomatic Socket.IO)
function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 10_000,
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

Server side: for every state-change command handler, call the ack once: `ack(null, result)` or
`ack(new Error("..."))`. Do not emit a separate `*_result` event for that command. The only push `*_result` is
`camera:snapshot_result` for the image payload (see exception above).

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
  "wifi:connect": { max: 3, windowMs: 30_000 },
  // ...
}

function checkRateLimit(socketId: string, event: string): boolean {
  const config = rateLimits[event]
  if (!config) return true // no limit configured
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

