import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type { SystemStats, SystemInfo } from "../../../../../shared/types/system"

type StatsCallback = (stats: SystemStats) => void
type InfoCallback = (info: SystemInfo) => void

class SystemClientModule implements SocketModule {
  name = "system"
  private socket: Socket | null = null
  private statsCallbacks: Set<StatsCallback> = new Set()
  private infoCallbacks: Set<InfoCallback> = new Set()
  private cachedStats: SystemStats | null = null
  private cachedInfo: SystemInfo | null = null

  register(socket: Socket): void {
    this.socket = socket
    socket.on("system:stats", (stats: SystemStats) => {
      this.cachedStats = stats
      this.statsCallbacks.forEach((cb) => cb(stats))
    })
    socket.on("system:info", (info: SystemInfo) => {
      this.cachedInfo = info
      this.infoCallbacks.forEach((cb) => cb(info))
    })
  }

  cleanup(): void {
    this.socket = null
    this.cachedStats = null
    this.cachedInfo = null
  }

  subscribe(): void {
    // Handled by SocketManager's module:subscribe emit
  }

  unsubscribe(): void {
    this.statsCallbacks.clear()
    this.infoCallbacks.clear()
  }

  onStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback)
    if (this.cachedStats) callback(this.cachedStats)
    return () => this.statsCallbacks.delete(callback)
  }

  onInfo(callback: InfoCallback): () => void {
    this.infoCallbacks.add(callback)
    if (this.cachedInfo) callback(this.cachedInfo)
    return () => this.infoCallbacks.delete(callback)
  }

  getCachedStats(): SystemStats | null {
    return this.cachedStats
  }

  getCachedInfo(): SystemInfo | null {
    return this.cachedInfo
  }
}

export const systemClientModule = new SystemClientModule()
