// WiFi Network from scan
export interface WiFiNetwork {
  ssid: string
  bssid: string
  signal: number  // 0-100
  security: string[]  // e.g. ["WPA2"]
  channel: number
  frequency: number
}

// Current WiFi connection
export interface WiFiConnection {
  ssid: string | null
  bssid: string | null
  ip: string | null
  mac: string
  status: "connected" | "disconnected" | "connecting"
  signal?: number
}

// WiFi scan request
export interface WiFiScanRequest {
  rescan?: boolean  // Force rescan if true
}

// WiFi connect request
export interface WiFiConnectRequest {
  ssid: string
  password?: string
}

// WiFi connect response (for ack)
export interface WiFiConnectResponse {
  success: boolean
  error?: string
}

// WiFi status event payload
export interface WiFiStatus {
  connected: boolean
  ssid: string | null
  ip: string | null
  mac: string
  signal: number | null
  networks: WiFiNetwork[]
}
