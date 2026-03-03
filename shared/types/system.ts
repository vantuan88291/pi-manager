export interface SystemStats {
  cpu: {
    usage: number // 0–100
    temperature: number // °C
    model: string
    cores: number
    frequency: number // MHz
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

export interface SystemInfo {
  hostname: string
  os: {
    distro: string
    release: string
    codename: string
    kernel: string
    arch: string
  }
  hardware: {
    model: string
    serial: string
  }
}
