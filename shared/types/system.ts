export interface SystemStats {
  cpu: {
    usage: number
    temperature: number
    model: string
    cores: number
    frequency: number
  }
  memory: {
    total: number
    used: number
    available: number
    free: number
    percent: number
  }
  disk: Array<{
    filesystem: string
    size: number
    used: number
    mount: string
    percent: number
  }>
  network: Array<{
    iface: string
    ip4: string
    mac: string
    speed: number | null
    isUp: boolean
  }>
  uptime: number
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
