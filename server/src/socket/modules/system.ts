import si from "systeminformation"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { SystemStats, SystemInfo } from "../../../../shared/types/system.js"

const POLL_INTERVAL_MS = 2000

// Track subscribers per socket
const subscribers = new Set<string>()

async function getSystemStats(): Promise<SystemStats> {
  const [cpu, mem, disk, network, temp] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkInterfaces(),
    si.cpuTemperature(),
  ])

  // Calculate actual used memory (excluding buffers/cache)
  // systeminformation.mem.used includes buffers/cache, so we use total - available instead
  const actualUsed = mem.total - mem.available

  return {
    cpu: {
      usage: Math.round(cpu.currentLoad),
      temperature: temp.main ?? 0,
      model: cpu.cpuModel || "Unknown",
      cores: cpu.cpus.length,
      frequency: cpu.currentLoad_user || 0,
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

export const systemModule: ServerSocketModule = {
  name: "system",

  register(socket: Socket, _io: Server) {
    socket.on("system:reboot", async () => {
      // Ack-only, destructive action - would need confirmation on frontend
      console.log("[system] reboot requested")
      // In production: execute `sudo reboot`
      socket.emit("error", {
        module: "system",
        code: "NOT_IMPLEMENTED",
        message: "Reboot not implemented in dev mode",
      })
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
