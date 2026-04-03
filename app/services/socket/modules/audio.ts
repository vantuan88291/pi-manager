import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type {
  AudioStatus,
  AudioSetVolumeRequest,
  AudioSetVolumeResponse,
  AudioSetOutputRequest,
  AudioSetOutputResponse,
  AudioTestSoundResponse,
} from "../../../../shared/types/audio"

type StatusCallback = (status: AudioStatus) => void

class AudioClientModule implements SocketModule {
  name = "audio"
  private socket: Socket | null = null
  private statusCallbacks: Set<StatusCallback> = new Set()
  private cachedStatus: AudioStatus | null = null

  register(socket: Socket): void {
    this.socket = socket

    socket.on("audio:status", (status: AudioStatus) => {
      this.cachedStatus = status
      this.statusCallbacks.forEach((cb) => cb(status))
    })
  }

  cleanup(): void {
    this.socket = null
    this.cachedStatus = null
  }

  subscribe(): void {
    // Handled by SocketManager's module:subscribe emit
  }

  unsubscribe(): void {
    this.statusCallbacks.clear()
  }

  // Request status
  requestStatus(): void {
    this.socket?.emit("audio:status")
  }

  // Set volume with ack
  setVolume(volume: number): Promise<AudioSetVolumeResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: AudioSetVolumeRequest = { volume }
      this.socket.emit("audio:set_volume", request, (response: AudioSetVolumeResponse) => {
        resolve(response)
      })
    })
  }

  // Toggle mute with ack
  toggleMute(): Promise<AudioSetVolumeResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      this.socket.emit("audio:toggle_mute", (response: AudioSetVolumeResponse) => {
        resolve(response)
      })
    })
  }

  // Set output device with ack
  setOutputDevice(deviceId: string): Promise<AudioSetOutputResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: AudioSetOutputRequest = { deviceId }
      this.socket.emit("audio:set_output", request, (response: AudioSetOutputResponse) => {
        resolve(response)
      })
    })
  }

  // Test sound with ack
  testSound(): Promise<AudioTestSoundResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      this.socket.emit("audio:test_sound", (response: AudioTestSoundResponse) => {
        resolve(response)
      })
    })
  }

  // Subscribe to status updates
  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback)
    if (this.cachedStatus) callback(this.cachedStatus)
    return () => this.statusCallbacks.delete(callback)
  }

  getCachedStatus(): AudioStatus | null {
    return this.cachedStatus
  }
}

export const audioClientModule = new AudioClientModule()
