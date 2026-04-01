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

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number
  user: string
  command: string
  started: number
}

export interface SystemAction {
  action: "reboot" | "shutdown" | "restart-service"
  serviceName?: string
  confirmed: boolean
}

export interface SystemActionResponse {
  success: boolean
  message: string
  action: string
}
