import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type {
  BluetoothDevice,
  BluetoothStatus,
  BluetoothPairRequest,
  BluetoothPairResponse,
  BluetoothConnectRequest,
  BluetoothConnectResponse,
} from "../../../../shared/types/bluetooth"

type StatusCallback = (status: BluetoothStatus) => void

class BluetoothClientModule implements SocketModule {
  name = "bluetooth"
  private socket: Socket | null = null
  private statusCallbacks: Set<StatusCallback> = new Set()
  private cachedStatus: BluetoothStatus | null = null

  register(socket: Socket): void {
    this.socket = socket

    socket.on("bluetooth:status", (status: BluetoothStatus) => {
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
    this.socket?.emit("bluetooth:status")
  }

  // Start scanning
  startScan(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      this.socket.emit("bluetooth:scan", (response: { success: boolean; error?: string }) => {
        resolve(response)
      })
    })
  }

  // Stop scanning
  stopScan(): void {
    this.socket?.emit("bluetooth:stop_scan")
  }

  // Pair with device
  pair(mac: string, pin?: string): Promise<BluetoothPairResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: BluetoothPairRequest = { mac, pin }
      this.socket.emit("bluetooth:pair", request, (response: BluetoothPairResponse) => {
        resolve(response)
      })
    })
  }

  // Connect to device
  connect(mac: string): Promise<BluetoothConnectResponse> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: BluetoothConnectRequest = { mac }
      this.socket.emit("bluetooth:connect", request, (response: BluetoothConnectResponse) => {
        resolve(response)
      })
    })
  }

  // Disconnect from device
  disconnect(mac: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: BluetoothConnectRequest = { mac }
      this.socket.emit(
        "bluetooth:disconnect",
        request,
        (response: { success: boolean; error?: string }) => {
          resolve(response)
        },
      )
    })
  }

  // Unpair device
  unpair(mac: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      const request: BluetoothConnectRequest = { mac }
      this.socket.emit(
        "bluetooth:unpair",
        request,
        (response: { success: boolean; error?: string }) => {
          resolve(response)
        },
      )
    })
  }

  // Toggle power
  togglePower(powered: boolean): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" })
        return
      }

      this.socket.emit(
        "bluetooth:toggle_power",
        { powered },
        (response: { success: boolean; error?: string }) => {
          resolve(response)
        },
      )
    })
  }

  // Subscribe to status updates
  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback)
    if (this.cachedStatus) callback(this.cachedStatus)
    return () => this.statusCallbacks.delete(callback)
  }

  getCachedStatus(): BluetoothStatus | null {
    return this.cachedStatus
  }
}

export const bluetoothClientModule = new BluetoothClientModule()
