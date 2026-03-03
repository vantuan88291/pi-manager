export interface WifiNetwork {
  ssid: string
  signal: number // 0–100
  security: "WPA2" | "WPA3" | "WEP" | "Open"
  frequency: number // MHz
  channel: number
  bssid: string
  connected: boolean
}

export interface WifiStatus {
  connected: boolean
  ssid?: string
  ip?: string
  signal?: number
  speed?: string
  gateway?: string
  dns?: string[]
}
