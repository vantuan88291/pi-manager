import { Socket } from "socket.io-client"
import type { SocketModule } from "../types"
import type { SystemStats, SystemInfo, ProcessInfo } from "../../../../../shared/types/system"

type StatsCallback = (stats: SystemStats) => void
type InfoCallback = (info: SystemInfo) => void
type ProcessesCallback = (processes: ProcessInfo[]) => void
type ActionCallback = (response: { success: boolean; message: string; action: string }) => void

class SystemClientModule implements SocketModule {
  name = "system"
  private socket: Socket | null = null
  private statsCallbacks: Set<StatsCallback> = new Set()
  private infoCallbacks: Set<InfoCallback> = new Set()
  private processesCallbacks: Set<ProcessesCallback> = new Set()
  private actionCallbacks: Set<ActionCallback> = new Set()
  private cachedStats: SystemStats | null = null
  private cachedInfo: SystemInfo | null = null
  private cachedProcesses: ProcessInfo[] | null = null

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
    socket.on("system:processes", (processes: ProcessInfo[]) => {
      this.cachedProcesses = processes
      this.processesCallbacks.forEach((cb) => cb(processes))
    })
    socket.on("system:action-complete", (response: { success: boolean; message: string; action: string }) => {
      this.actionCallbacks.forEach((cb) => cb(response))
    })
    socket.on("system:action-failed", (response: { success: boolean; message: string; action: string }) => {
      this.actionCallbacks.forEach((cb) => cb(response))
    })
    socket.on("system:process-killed", (response: { success: boolean; pid: number; message?: string }) => {
      // Refresh process list after kill
      this.requestProcessList()
    })
  }

  cleanup(): void {
    this.socket = null
    this.cachedStats = null
    this.cachedInfo = null
    this.cachedProcesses = null
  }

  subscribe(): void {
    // Handled by SocketManager's module:subscribe emit
  }

  unsubscribe(): void {
    this.statsCallbacks.clear()
    this.infoCallbacks.clear()
    this.processesCallbacks.clear()
    this.actionCallbacks.clear()
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

  onProcesses(callback: ProcessesCallback): () => void {
    this.processesCallbacks.add(callback)
    if (this.cachedProcesses) callback(this.cachedProcesses)
    return () => this.processesCallbacks.delete(callback)
  }

  onAction(callback: ActionCallback): () => void {
    this.actionCallbacks.add(callback)
    return () => this.actionCallbacks.delete(callback)
  }

  getCachedStats(): SystemStats | null {
    return this.cachedStats
  }

  getCachedInfo(): SystemInfo | null {
    return this.cachedInfo
  }

  getCachedProcesses(): ProcessInfo[] | null {
    return this.cachedProcesses
  }

  requestReboot(): void {
    this.socket?.emit("system:reboot")
  }

  requestShutdown(): void {
    this.socket?.emit("system:shutdown")
  }

  requestRestartService(serviceName: string): void {
    this.socket?.emit("system:restart-service", { serviceName })
  }

  requestKillProcess(pid: number): void {
    this.socket?.emit("system:kill-process", { pid })
  }

  requestProcessList(): void {
    this.socket?.emit("system:list-processes")
  }
}

export const systemClientModule = new SystemClientModule()
