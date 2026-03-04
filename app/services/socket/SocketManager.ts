import { io, Socket } from "socket.io-client"
import type { SocketModule, ConnectionState, TelegramUser } from "./types"

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001"

class SocketManager {
  private socket: Socket | null = null
  private modules: Map<string, SocketModule> = new Map()
  private sessionToken: string | null = null
  private initData: string | null = null
  private state: ConnectionState = {
    status: "disconnected",
    isAuthenticated: false,
    user: null,
    error: null,
  }
  private listeners: Set<(state: ConnectionState) => void> = new Set()

  getState(): ConnectionState {
    return { ...this.state }
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => l(this.getState()))
  }

  registerModule(mod: SocketModule) {
    this.modules.set(mod.name, mod)
  }

  connect(initData?: string) {
    if (this.socket?.connected) return

    this.initData = initData ?? null
    this.state = { ...this.state, status: "connecting", error: null }
    this.notify()

    this.socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      transports: ["websocket", "polling"],
      auth: this.sessionToken
        ? { sessionToken: this.sessionToken }
        : initData
          ? { initData }
          : {},
    })

    this.socket.on("connect", () => {
      this.state = { ...this.state, status: "connected", error: null }
      this.notify()
      this.modules.forEach((mod) => mod.register(this.socket!))
    })

    this.socket.on("auth:success", ({ user, sessionToken }: { user: TelegramUser; sessionToken: string }) => {
      this.sessionToken = sessionToken
      this.state = {
        ...this.state,
        isAuthenticated: true,
        user,
        error: null,
      }
      this.notify()
    })

    this.socket.on("disconnect", () => {
      this.state = { ...this.state, status: "disconnected", isAuthenticated: false }
      this.notify()
      this.modules.forEach((mod) => mod.cleanup())
      // Prefer sessionToken on reconnect
      if (this.socket && this.sessionToken) {
        this.socket.auth = { sessionToken: this.sessionToken }
      }
    })

    this.socket.on("connect_error", (err: Error) => {
      if (err.message === "SESSION_EXPIRED" && this.initData) {
        // Fall back to initData
        this.sessionToken = null
        this.socket!.auth = { initData: this.initData }
        return
      }
      this.state = {
        ...this.state,
        status: "error",
        isAuthenticated: false,
        error: err.message,
      }
      this.notify()
    })

    this.socket.connect()
  }

  disconnect() {
    if (!this.socket) return
    this.socket.disconnect()
    this.socket = null
    this.sessionToken = null
    this.state = {
      status: "disconnected",
      isAuthenticated: false,
      user: null,
      error: null,
    }
    this.notify()
  }

  subscribeToModule(moduleName: string) {
    this.socket?.emit("module:subscribe", { module: moduleName })
    this.modules.get(moduleName)?.subscribe()
  }

  unsubscribeFromModule(moduleName: string) {
    this.socket?.emit("module:unsubscribe", { module: moduleName })
    this.modules.get(moduleName)?.unsubscribe()
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export const socketManager = new SocketManager()
