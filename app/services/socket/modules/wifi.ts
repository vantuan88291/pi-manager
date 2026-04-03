import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type {
  WiFiNetwork,
  WiFiConnection,
  WiFiStatus,
  WiFiConnectRequest,
  WiFiConnectResponse,
} from "../../../../shared/types/wifi"

type StatusCallback = (status: WiFiStatus) => void
type ScanCallback = (networks: WiFiNetwork[], error?: string) => void

class WiFiClientModule implements SocketModule {
  name = "wifi"
  private socket: Socket | null = null
  private statusCallbacks: Set<StatusCallback> = new Set()
  private scanCallbacks: Set<ScanCallback> = new Set()
  private cachedStatus: WiFiStatus | null = null

  register(socket: Socket): void {
    this.socket = socket

    socket.on("wifi:status", (status: WiFiStatus) => {
      this.cachedStatus = status
      this.statusCallbacks.forEach((cb) => cb(status))
    })

    socket.on(
      "wifi:scan_result",
      ({ networks, error }: { networks: WiFiNetwork[]; error?: string }) => {
        this.scanCallbacks.forEach((cb) => cb(networks, error))
      },
    )
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
    this.scanCallbacks.clear()
  }

  // Request scan
  scan(): void {
    this.socket?.emit("wifi:scan")
  }

  // Connect to network with ack
  connect(ssid: string, password?: string): Promise<WiFiConnectResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: WiFiConnectRequest = { ssid, password }
      this.socket.emit("wifi:connect", request, (response: WiFiConnectResponse) => {
        resolve(response)
      })
    })
  }

  // Disconnect with ack
  disconnect(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      this.socket.emit("wifi:disconnect", (response: { success: boolean; error?: string }) => {
        resolve(response)
      })
    })
  }

  // Request current status
  requestStatus(): void {
    this.socket?.emit("wifi:status")
  }

  // Subscribe to status updates
  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback)
    if (this.cachedStatus) callback(this.cachedStatus)
    return () => this.statusCallbacks.delete(callback)
  }

  // Subscribe to scan results
  onScan(callback: ScanCallback): () => void {
    this.scanCallbacks.add(callback)
    return () => this.scanCallbacks.delete(callback)
  }

  getCachedStatus(): WiFiStatus | null {
    return this.cachedStatus
  }
}

export const wifiClientModule = new WiFiClientModule()
