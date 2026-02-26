# Appendix B: Shared Socket Event Map (copy-paste ready)

> Split backend docs (Appendix B).

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

