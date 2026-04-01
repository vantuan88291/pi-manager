import si from "systeminformation"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { SystemStats, SystemInfo, ProcessInfo } from "../../../../shared/types/system.js"

const execAsync = promisify(exec)
const POLL_INTERVAL_MS = 2000

// Track subscribers per socket
const subscribers = new Set<string>()

async function getSystemStats(): Promise<SystemStats> {
  const [cpu, mem, disk, network, temp, cpuInfo] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkInterfaces(),
    si.cpuTemperature(),
    si.cpu(),
  ])

  // Calculate actual used memory (excluding buffers/cache)
  // systeminformation.mem.used includes buffers/cache, so we use total - available instead
  const actualUsed = mem.total - mem.available

  return {
    cpu: {
      usage: Math.round(cpu.currentLoad),
      temperature: temp.main ?? 0,
      model: cpuInfo.manufacturer || "Unknown",
      cores: cpu.cpus.length,
      frequency: cpu.currentLoadUser || 0,
    },
    memory: {
      total: mem.total,
      used: actualUsed,
      available: mem.available,
      free: mem.free,
      percent: Math.round((actualUsed / mem.total) * 100),
    },
    disk: disk.map((d) => ({
      filesystem: d.fs,
      size: d.size,
      used: d.used,
      mount: d.mount,
      percent: Math.round(d.use || 0),
    })),
    network: network.map((n) => ({
      iface: n.iface,
      ip4: n.ip4 || "",
      mac: n.mac || "",
      speed: n.speed || null,
      isUp: n.operstate === "up",
    })),
    uptime: Math.floor(process.uptime()),
  }
}

async function getSystemInfo(): Promise<SystemInfo> {
  const [osInfo, system] = await Promise.all([si.osInfo(), si.system()])

  return {
    hostname: osInfo.hostname,
    os: {
      distro: osInfo.distro,
      release: osInfo.release,
      codename: osInfo.codename || "",
      kernel: osInfo.kernel,
      arch: osInfo.arch,
    },
    hardware: {
      model: system.model || "Unknown",
      serial: system.serial || "Unknown",
    },
  }
}

async function getProcessList(): Promise<ProcessInfo[]> {
  const { stdout } = await execAsync(
    "ps -eo pid,comm,%cpu,%mem,user,lstart,cmd --no-headers --sort=-%cpu | head -20",
    { timeout: 5000 }
  )

  const processes: ProcessInfo[] = []
  const lines = stdout.trim().split("\n")

  for (const line of lines) {
    if (!line.trim()) continue

    // Parse ps output: pid comm %cpu %mem user lstart cmd
    // lstart is "Day Mon DD HH:MM:SS YYYY" (5 fields)
    const parts = line.trim().split(/\s+/)
    if (parts.length < 10) continue

    const pid = parseInt(parts[0])
    const name = parts[1]
    const cpu = parseFloat(parts[2])
    const memory = parseFloat(parts[3])
    const user = parts[4]
    // lstart is parts[5] to parts[9] (5 fields)
    const startedStr = parts.slice(5, 10).join(" ")
    const started = new Date(startedStr).getTime()
    // cmd is everything after lstart
    const command = parts.slice(10).join(" ") || name

    if (!isNaN(pid)) {
      processes.push({ pid, name, cpu, memory, user, command, started })
    }
  }

  return processes
}

export const systemModule: ServerSocketModule = {
  name: "system",

  register(socket: Socket, _io: Server) {
    socket.on("system:reboot", async () => {
      console.log("[system] reboot requested")
      try {
        socket.emit("system:action-started", { action: "reboot", message: "Rebooting..." })
        // In production: await execAsync("sudo reboot")
        // For now, simulate success
        setTimeout(() => {
          socket.emit("system:action-complete", { 
            success: true, 
            message: "System rebooted successfully", 
            action: "reboot" 
          })
        }, 2000)
      } catch (error: any) {
        socket.emit("system:action-failed", {
          success: false,
          message: error.message || "Reboot failed",
          action: "reboot",
        })
      }
    })

    socket.on("system:shutdown", async () => {
      console.log("[system] shutdown requested")
      try {
        socket.emit("system:action-started", { action: "shutdown", message: "Shutting down..." })
        // In production: await execAsync("sudo shutdown now")
        setTimeout(() => {
          socket.emit("system:action-complete", { 
            success: true, 
            message: "System shutdown successfully", 
            action: "shutdown" 
          })
        }, 2000)
      } catch (error: any) {
        socket.emit("system:action-failed", {
          success: false,
          message: error.message || "Shutdown failed",
          action: "shutdown",
        })
      }
    })

    socket.on("system:restart-service", async ({ serviceName }: { serviceName: string }) => {
      console.log(`[system] restart-service requested: ${serviceName}`)
      try {
        socket.emit("system:action-started", { action: "restart-service", message: `Restarting ${serviceName}...` })
        await execAsync(`sudo systemctl restart ${serviceName}`, { timeout: 30000 })
        socket.emit("system:action-complete", { 
          success: true, 
          message: `${serviceName} restarted successfully`, 
          action: "restart-service" 
        })
      } catch (error: any) {
        socket.emit("system:action-failed", {
          success: false,
          message: error.message || `Failed to restart ${serviceName}`,
          action: "restart-service",
        })
      }
    })

    socket.on("system:kill-process", async ({ pid }: { pid: number }) => {
      console.log(`[system] kill-process requested: ${pid}`)
      
      // Prevent killing critical system processes
      const currentPid = process.pid
      if (pid === currentPid || pid === 1 || pid <= 10) {
        socket.emit("system:process-killed", { 
          success: false, 
          pid, 
          message: "Cannot kill critical system process" 
        })
        return
      }
      
      try {
        const { stdout, stderr } = await execAsync(`kill -9 ${pid}`, { timeout: 5000 })
        console.log(`[system] process ${pid} killed successfully`)
        socket.emit("system:process-killed", { success: true, pid, message: "Process terminated" })
      } catch (error: any) {
        console.error(`[system] kill-process failed: ${error.message}`)
        socket.emit("system:process-killed", { 
          success: false, 
          pid, 
          message: error.message || "Permission denied or process not found",
          stderr: error.stderr
        })
      }
    })

    socket.on("system:list-processes", async () => {
      try {
        const processes = await getProcessList()
        socket.emit("system:processes", processes)
      } catch (error: any) {
        socket.emit("error", {
          module: "system",
          code: "PROCESS_LIST_FAILED",
          message: error.message,
        })
      }
    })
  },

  onSubscribe(socket: Socket) {
    if (subscribers.has(socket.id)) return
    subscribers.add(socket.id)

    console.log(`[system] subscriber added: ${socket.id} (${subscribers.size} total)`)

    // Send system info once
    getSystemInfo().then((info) => {
      socket.emit("system:info", info)
    })

    // Start polling stats
    const interval = setInterval(async () => {
      if (!subscribers.has(socket.id)) {
        clearInterval(interval)
        return
      }
      try {
        const stats = await getSystemStats()
        socket.emit("system:stats", stats)
      } catch (err) {
        console.error("[system] stats error:", err)
      }
    }, POLL_INTERVAL_MS)

    // Store interval for cleanup
    socket.data.systemInterval = interval
  },

  onUnsubscribe(socket: Socket) {
    subscribers.delete(socket.id)
    if (socket.data.systemInterval) {
      clearInterval(socket.data.systemInterval)
      delete socket.data.systemInterval
    }
    console.log(`[system] subscriber removed: ${socket.id} (${subscribers.size} total)`)
  },
}
