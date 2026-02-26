# Socket Event Contracts

> Split backend docs (Socket Event Contracts).

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
"camera:snapshot": () => void // ack = success/error; image data via camera:snapshot_result (large payload)

// Bidirectional (WebRTC signaling)
"camera:offer": (data: RTCSessionDescriptionInit) => void
"camera:answer": (data: RTCSessionDescriptionInit) => void
"camera:ice_candidate": (data: RTCIceCandidateInit) => void

// Server → Client (only *_result event: snapshot returns base64 via push, not ack)
"camera:snapshot_result": (data: { base64: string; timestamp: number }) => void
"camera:error": (data: { message: string }) => void
```

### 4.8 Storage Module (SSD Health)

```typescript
// Client → Server
"storage:refresh": () => void // force re-read S.M.A.R.T. data

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
  module: string // which module caused the error
  code: string // machine-readable: "WIFI_AUTH_FAILED", "BT_DEVICE_NOT_FOUND"
  message: string // human-readable description
}) => void
```

