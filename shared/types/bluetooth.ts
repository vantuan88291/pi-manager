// Bluetooth device from scan
export interface BluetoothDevice {
  mac: string
  name: string | null
  type: string | null  // audio, input, display, unknown
  rssi: number | null
  paired: boolean
  connected: boolean
}

// Bluetooth status
export interface BluetoothStatus {
  powered: boolean
  discovering: boolean
  devices: BluetoothDevice[]
}

// Bluetooth pair request
export interface BluetoothPairRequest {
  mac: string
  pin?: string
}

// Bluetooth pair response (for ack)
export interface BluetoothPairResponse {
  success: boolean
  error?: string
}

// Bluetooth connect request
export interface BluetoothConnectRequest {
  mac: string
}

// Bluetooth connect response (for ack)
export interface BluetoothConnectResponse {
  success: boolean
  error?: string
}
