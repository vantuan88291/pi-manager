import { useEffect, useState } from "react"
import { useSocket } from "@/services/socket/SocketContext"
import { systemClientModule } from "@/services/socket"
import type { SystemStats, SystemInfo } from "../../../shared/types/system"

export function useSystemStats() {
  const { state, subscribeToModule, unsubscribeFromModule } = useSocket()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    if (state.status !== "connected" || !state.isAuthenticated) return

    subscribeToModule("system")

    const unsubStats = systemClientModule.onStats(setStats)
    const unsubInfo = systemClientModule.onInfo(setInfo)

    return () => {
      unsubStats()
      unsubInfo()
      unsubscribeFromModule("system")
    }
  }, [state.status, state.isAuthenticated, subscribeToModule, unsubscribeFromModule])

  return { stats, info, isConnected: state.status === "connected" && state.isAuthenticated }
}
