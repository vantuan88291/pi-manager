import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type { StorageStatus } from "../../../../shared/types/storage"

type StatusCallback = (status: StorageStatus) => void

class StorageClientModule implements SocketModule {
  name = "storage"
  private socket: Socket | null = null
  private statusCallbacks: Set<StatusCallback> = new Set()
  private cachedStatus: StorageStatus | null = null

  register(socket: Socket): void {
    this.socket = socket

    socket.on("storage:status", (status: StorageStatus) => {
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
    this.socket?.emit("storage:status")
  }

  // Refresh status
  refresh(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false })
        return
      }

      this.socket.emit("storage:refresh", (response: { success: boolean }) => {
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

  getCachedStatus(): StorageStatus | null {
    return this.cachedStatus
  }
}

export const storageClientModule = new StorageClientModule()
