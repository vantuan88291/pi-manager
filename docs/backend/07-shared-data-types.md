# Data Types (`shared/`)

> Split backend docs (Shared data types).

## 8. Data Types (shared/)

```typescript
// shared/types/system.ts
interface SystemStats {
  cpu: {
    usage: number // 0–100
    temperature: number // °C
    model: string // "Cortex-A72"
    cores: number
    frequency: number // MHz, current
  }
  memory: {
    total: number // bytes
    used: number
    free: number
    percent: number // 0–100
  }
  disk: Array<{
    filesystem: string
    size: number // bytes
    used: number
    mount: string
    percent: number
  }>
  network: Array<{
    iface: string // "wlan0", "eth0"
    ip4: string
    mac: string
    speed: number | null // Mbps
    isUp: boolean
  }>
  uptime: number // seconds
}

interface SystemInfo {
  hostname: string
  os: {
    distro: string // "Raspbian GNU/Linux"
    release: string // "12"
    codename: string // "Bookworm"
    kernel: string // "6.1.0-rpi7-rpi-v8"
    arch: string // "arm64"
  }
  hardware: {
    model: string // "Raspberry Pi 4 Model B Rev 1.4"
    serial: string
  }
}

// shared/types/wifi.ts
interface WifiNetwork {
  ssid: string
  signal: number // 0–100
  security: "WPA2" | "WPA3" | "WEP" | "Open"
  frequency: number // MHz
  channel: number
  bssid: string
  connected: boolean
}

interface WifiStatus {
  connected: boolean
  ssid?: string
  ip?: string
  signal?: number
  speed?: string // "72 Mbps"
  gateway?: string
  dns?: string[]
}

// shared/types/bluetooth.ts
interface BluetoothDevice {
  name: string | null
  mac: string
  rssi: number
  paired: boolean
  connected: boolean
  type: "audio" | "input" | "display" | "unknown"
  icon: string // mapped from type
}

interface BluetoothStatus {
  powered: boolean
  discoverable: boolean
  discovering: boolean
  connectedDevices: BluetoothDevice[]
}

// shared/types/audio.ts
interface AudioState {
  volume: number // 0–100
  muted: boolean
  output: string // active output id
  availableOutputs: Array<{
    id: string // "hdmi", "analog", "bluez_sink.XX_XX_XX"
    name: string // "HDMI", "3.5mm Jack", "JBL Flip 6"
    type: "hdmi" | "analog" | "bluetooth" | "usb"
  }>
}

// shared/types/camera.ts
type CameraResolution = "480p" | "720p" | "1080p"

interface CameraConfig {
  resolution: CameraResolution
  fps: number
  bitrate: number // kbps
}

// shared/types/storage.ts
interface StorageHealth {
  device: string // "/dev/nvme0n1"
  model: string // "Samsung 970 EVO Plus 250GB"
  serial: string // drive serial number
  firmware: string // firmware version
  size: number // bytes, total capacity
  temperature: number // °C
  percentageUsed: number // 0–100, lifespan consumed
  powerOnHours: number // total hours powered on
  dataUnitsWritten: number // data units written (each unit = 512KB × 1000)
  dataUnitsRead: number // data units read
  mediaErrors: number // media/integrity errors (should be 0)
  unsafeShutdowns: number // unexpected power loss count
  errorLogEntries: number // number of error log entries
  availableSpare: number // 0–100%, remaining spare blocks
  availableSpareThreshold: number // threshold below which spare is critical
  criticalWarning: number // critical warning bitmap (0 = no warnings)
  partitions: DiskPartition[] // mounted partitions from df
}

interface DiskPartition {
  device: string // "/dev/nvme0n1p1"
  mount: string // "/"
  filesystem: string // "ext4", "vfat"
  size: number // bytes
  used: number // bytes
  percent: number // 0–100
}

// shared/types/telegram.ts
interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

interface AuthPayload {
  initData: string // raw Telegram WebApp initData
}

```

