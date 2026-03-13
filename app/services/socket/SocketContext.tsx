import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { socketManager, systemClientModule, wifiClientModule, bluetoothClientModule, audioClientModule, storageClientModule } from "./"
import type { ConnectionState, TelegramUser } from "./types"

// Helper to parse Telegram initDataUnsafe
function parseTelegramInitData(initDataUnsafe: any): TelegramUser | null {
  if (!initDataUnsafe?.user) return null
  
  const user = initDataUnsafe.user
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
    languageCode: user.language_code,
  }
}

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
    socketManager.registerModule(audioClientModule)
    socketManager.registerModule(storageClientModule)

    // Subscribe to state changes
    const unsubscribe = socketManager.subscribe(setState)

    // Auto-connect with Telegram initData (if available) or dev mode
    const connectWithAuth = () => {
      if (typeof window !== "undefined") {
        const tg = (window as any).Telegram?.WebApp
        const isDebug = process.env.EXPO_PUBLIC_DEBUG === "true"
        
        if (tg && tg.initData) {
          console.log("[SocketProvider] Telegram WebApp detected, connecting with auth...")
          console.log("[SocketProvider] initDataUnsafe:", tg.initDataUnsafe)
          
          // Parse and set user data immediately for better UX
          const user = parseTelegramInitData(tg.initDataUnsafe)
          if (user) {
            console.log(`[SocketProvider] Parsed user: ${user.firstName} (${user.id})`)
            
            // Set temporary state while waiting for backend validation
            setState({
              status: "connecting",
              isAuthenticated: false,
              user,
              error: null,
            })
          }
          
          // Connect to backend for proper validation
          socketManager.connect(tg.initData)
        } else if (isDebug) {
          console.log("[SocketProvider] DEBUG mode: connecting without Telegram auth (browser testing)")
          socketManager.connect()
        } else {
          // Production mode without Telegram = show unauthenticated state
          console.log("[SocketProvider] No Telegram WebApp, showing unauthenticated state")
          setState({
            status: "disconnected",
            isAuthenticated: false,
            user: null,
            error: "Telegram required. Please open this app from Telegram.",
          })
        }
      } else {
        socketManager.connect()
      }
    }

    connectWithAuth()

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
