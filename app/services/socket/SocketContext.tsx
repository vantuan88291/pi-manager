import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { socketManager, systemClientModule, wifiClientModule, bluetoothClientModule } from "./"
import type { ConnectionState, TelegramUser } from "./types"

interface SocketContextValue {
  state: ConnectionState
  connect: (initData?: string) => void
  disconnect: () => void
  subscribeToModule: (name: string) => void
  unsubscribeFromModule: (name: string) => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>(socketManager.getState())

  useEffect(() => {
    // Register modules
    socketManager.registerModule(systemClientModule)
    socketManager.registerModule(wifiClientModule)
    socketManager.registerModule(bluetoothClientModule)

    // Subscribe to state changes
    const unsubscribe = socketManager.subscribe(setState)

    // Auto-connect in dev mode (no initData)
    if (!process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN) {
      socketManager.connect()
    }

    return () => {
      unsubscribe()
      socketManager.disconnect()
    }
  }, [])

  const connect = useCallback((initData?: string) => {
    socketManager.connect(initData)
  }, [])

  const disconnect = useCallback(() => {
    socketManager.disconnect()
  }, [])

  const subscribeToModule = useCallback((name: string) => {
    socketManager.subscribeToModule(name)
  }, [])

  const unsubscribeFromModule = useCallback((name: string) => {
    socketManager.unsubscribeFromModule(name)
  }, [])

  return (
    <SocketContext.Provider value={{ state, connect, disconnect, subscribeToModule, unsubscribeFromModule }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error("useSocket must be used within SocketProvider")
  return ctx
}

export function useConnectionState() {
  const { state } = useSocket()
  return state
}
