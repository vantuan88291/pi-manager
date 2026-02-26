# Appendix E: WebRTC Camera Stack (detailed)

> Split backend docs (Appendix E).

## E.1 Stack choice

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

## E.2 Default configuration & constraints

| Setting | Default | Min | Max | Notes |
|---------|---------|-----|-----|-------|
| Resolution | 720p (1280×720) | 480p (640×480) | 1080p (1920×1080) | User-selectable |
| FPS | 24 | 15 | 30 | Lower if CPU > 80% |
| Bitrate | 1500 kbps | 500 kbps | 3000 kbps | Adaptive based on bandwidth |
| Codec | H.264 (Baseline) | — | — | Hardware-encoded on Pi |

## E.3 CPU impact & adaptive quality

Streaming consumes ~15–30% CPU on Pi 4 (H.264 hardware encoder offloads most work).
If `system:stats` shows CPU > 80% during stream, the server automatically:
1. Drops FPS to 15
2. Reduces bitrate to 500 kbps
3. Emits `camera:error` with message "Quality reduced due to high CPU load"

## E.4 Server camera module outline

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
        "--width",
        String(res.width),
        "--height",
        String(res.height),
        "--framerate",
        "24",
        "--bitrate",
        "1500000",
        "--codec",
        "h264",
        "--inline", // include SPS/PPS in stream
        "--nopreview",
        "-t",
        "0", // run indefinitely
        "-o",
        "-", // output to stdout
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
        "--width",
        "1280",
        "--height",
        "720",
        "--encoding",
        "jpg",
        "--quality",
        "85",
        "-o",
        "-", // output to stdout
        "--nopreview",
        "-t",
        "1",
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

  onSubscribe(_socket) {
    /* camera starts on explicit "camera:start", not on subscribe */
  },
  onUnsubscribe(socket) {
    // Clean up if user disconnects while streaming
    cameraProcess?.kill("SIGTERM")
    cameraProcess = null
    peerConnection?.close()
    peerConnection = null
  },
}
```

## E.5 Fallbacks & error handling

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| No camera module connected | `libcamera-vid` exits with code 1 | Emit `camera:error` "No camera detected" |
| Camera busy (another process) | Exit code or stderr contains "EBUSY" | Emit `camera:error` "Camera is in use by another process" |
| libcamera not installed | `ENOENT` spawn error | Emit `camera:error` "libcamera-vid not found. Install with: sudo apt install libcamera-apps" |
| WebRTC connection fails | ICE connection state "failed" | Emit `camera:error` "Connection failed. Check network." |
| Browser doesn't support WebRTC | Client-side check before emitting `camera:start` | Show "Your browser does not support live streaming" in UI |

