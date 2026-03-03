import { useEffect, useState, useCallback } from "react"
import { useSocket } from "@/services/socket/SocketContext"
import { systemClientModule } from "@/services/socket"
import type { SystemStats, SystemInfo } from "../../../shared/types/system"

interface UseSystemStatsReturn {
  stats: SystemStats | null
  info: SystemInfo | null
  isConnected: boolean
  error: Error | null
  retry: () => void
}

export function useSystemStats(): UseSystemStatsReturn {
  const { state, subscribeToModule, unsubscribeFromModule } = useSocket()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Retry on disconnect (max 5 retries with exponential backoff)
  useEffect(() => {
    if (state.status === "disconnected" && retryCount < 5) {
      const timeout = setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, Math.min(1000 * Math.pow(2, retryCount), 10000))
      return () => clearTimeout(timeout)
    }
  }, [state.status, retryCount])

  // Reset retry count on reconnect
  useEffect(() => {
    if (state.status === "connected" && state.isAuthenticated) {
      setRetryCount(0)
      setError(null)
    }
  }, [state.status, state.isAuthenticated])

  const retry = useCallback(() => {
    setRetryCount(0)
    setError(null)
  }, [])

  useEffect(() => {
    if (state.status !== "connected" || !state.isAuthenticated) {
      if (state.status === "disconnected" && retryCount >= 5) {
        setError(new Error("Failed to connect after 5 retries. Please check your connection."))
      }
      return
    }

    subscribeToModule("system")

    const unsubStats = systemClientModule.onStats((newStats) => {
      setStats(newStats)
      setError(null)
    })
    const unsubInfo = systemClientModule.onInfo((newInfo) => {
      setInfo(newInfo)
      setError(null)
    })

    return () => {
      unsubStats()
      unsubInfo()
      unsubscribeFromModule("system")
    }
  }, [state.status, state.isAuthenticated, subscribeToModule, unsubscribeFromModule, retryCount])

  return {
    stats,
    info,
    isConnected: state.status === "connected" && state.isAuthenticated,
    error,
    retry,
  }
}
