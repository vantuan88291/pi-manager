import { useEffect, useState, useCallback } from "react"
import { useSocket } from "@/services/socket/SocketContext"
import { wifiClientModule } from "@/services/socket/modules/wifi"
import type { WiFiStatus } from "../../../shared/types/wifi"

interface UseWiFiStatsReturn {
  wifiStatus: WiFiStatus | null
  currentSSID: string | null
  signalStrength: number | null
  isConnected: boolean
}

export function useWiFiStats(): UseWiFiStatsReturn {
  const { state, subscribeToModule, unsubscribeFromModule } = useSocket()
  const [wifiStatus, setWifiStatus] = useState<WiFiStatus | null>(null)

  useEffect(() => {
    if (state.status !== "connected" || !state.isAuthenticated) return

    subscribeToModule("wifi")

    const unsubStatus = wifiClientModule.onStatus((status) => {
      setWifiStatus(status)
    })

    return () => {
      unsubStatus()
      unsubscribeFromModule("wifi")
    }
  }, [state.status, state.isAuthenticated, subscribeToModule, unsubscribeFromModule])

  return {
    wifiStatus,
    currentSSID: wifiStatus?.ssid ?? null,
    signalStrength: wifiStatus?.signal ?? null,
    isConnected: wifiStatus?.connected ?? false,
  }
}
