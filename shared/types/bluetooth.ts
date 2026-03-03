export interface BluetoothDevice {
  name: string | null
  mac: string
  rssi: number
  paired: boolean
  connected: boolean
  type: "audio" | "input" | "display" | "unknown"
  icon: string
}

export interface BluetoothStatus {
  powered: boolean
  discoverable: boolean
  discovering: boolean
  connectedDevices: BluetoothDevice[]
}
