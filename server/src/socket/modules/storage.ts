import { spawn } from "node:child_process"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { StorageStatus, StorageHealth, Partition } from "../../../../shared/types/storage.js"

const POLL_INTERVAL_MS = 10000  // 10 seconds

interface Subscriber {
  socketId: string
  pollInterval?: NodeJS.Timeout
}

const subscribers = new Map<string, Subscriber>()

// Get NVMe S.M.A.R.T. data (with sudo)
async function getSmartData(): Promise<StorageHealth | null> {
  return new Promise((resolve) => {
    // Use sudo to read NVMe SMART data
    const proc = spawn('sudo', ['/usr/sbin/nvme', 'smart-log', '/dev/nvme0n1', '-o', 'json'])
    let output = ''
    let errorOutput = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const data = JSON.parse(output)
          const health: StorageHealth = {
            percentageUsed: data.percentage_used || 0,
            temperature: parseInt(data.temperature_sensor_1) || 0,
            powerOnHours: parseInt(data.power_on_hours) || 0,
            dataUnitsWritten: parseInt(data.data_units_written) || 0,
            dataUnitsRead: parseInt(data.data_units_read) || 0,
            criticalWarning: data.critical_warning || 0,
            availableSpare: data.available_spare || 0,
            availableSpareThreshold: data.available_spare_threshold || 0,
            mediaErrors: parseInt(data.media_errors) || 0,
            unsafeShutdowns: parseInt(data.unsafe_shutdowns) || 0,
            errorLogEntries: parseInt(data.num_err_log_entries) || 0,
          }
          resolve(health)
        } catch (e) {
          console.error('[storage] parse smart data error:', e)
          resolve(null)
        }
      } else {
        if (errorOutput) console.error('[storage] nvme smart-log error:', errorOutput)
        resolve(null)
      }
    })
    
    proc.on('error', (err) => {
      console.error('[storage] nvme smart-log spawn error:', err)
      resolve(null)
    })
  })
}

// Get disk partitions
async function getPartitions(): Promise<Partition[]> {
  return new Promise((resolve) => {
    const proc = spawn('df', ['-h'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const lines = output.trim().split('\n')
      const partitions: Partition[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s+/)
        if (parts.length >= 6) {
          const percent = parseInt(parts[4].replace('%', '')) || 0
          partitions.push({
            mount: parts[5],
            filesystem: parts[0],
            size: parseSize(parts[1]),
            used: parseSize(parts[2]),
            free: parseSize(parts[3]),
            percent,
          })
        }
      }
      
      resolve(partitions)
    })
    
    proc.on('error', () => resolve([]))
  })
}

// Parse size string (e.g., "117G" -> bytes)
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/(\d+(?:\.\d+)?)([KMGTP]?)$/)
  if (!match) return 0
  
  const value = parseFloat(match[1])
  const unit = match[2]
  
  const multipliers: Record<string, number> = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
  }
  
  return value * (multipliers[unit] || 1)
}

// Get drive info (with sudo)
async function getDriveInfo(): Promise<{ model: string; serial: string; firmware: string; interface: string; capacity: number }> {
  return new Promise((resolve) => {
    const proc = spawn('sudo', ['/usr/sbin/nvme', 'list', '-o', 'json'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const data = JSON.parse(output)
          const device = data.Devices?.[0]
          if (device) {
            resolve({
              model: device.ModelNumber || 'Unknown',
              serial: device.SerialNumber || 'Unknown',
              firmware: device.Firmware || 'Unknown',
              interface: 'NVMe',
              capacity: parseInt(device.PhysicalSize) || 0,
            })
          } else {
            resolve({ model: 'Unknown', serial: 'Unknown', firmware: 'Unknown', interface: 'Unknown', capacity: 0 })
          }
        } catch (e) {
          resolve({ model: 'Unknown', serial: 'Unknown', firmware: 'Unknown', interface: 'Unknown', capacity: 0 })
        }
      } else {
        resolve({ model: 'Unknown', serial: 'Unknown', firmware: 'Unknown', interface: 'Unknown', capacity: 0 })
      }
    })
    
    proc.on('error', () => {
      resolve({ model: 'Unknown', serial: 'Unknown', firmware: 'Unknown', interface: 'Unknown', capacity: 0 })
    })
  })
}

// Get full storage status
async function getStorageStatus(): Promise<StorageStatus> {
  const [health, partitions, driveInfo] = await Promise.all([
    getSmartData(),
    getPartitions(),
    getDriveInfo(),
  ])
  
  return {
    health,
    partitions,
    model: driveInfo.model,
    serial: driveInfo.serial,
    firmware: driveInfo.firmware,
    interface: driveInfo.interface,
    capacity: driveInfo.capacity,
  }
}

export const storageModule: ServerSocketModule = {
  name: "storage",

  register(socket: Socket, io: Server) {
    // Get status
    socket.on("storage:status", async () => {
      const status = await getStorageStatus()
      socket.emit("storage:status", status)
    })

    // Refresh status
    socket.on("storage:refresh", async (callback?: (response: { success: boolean }) => void) => {
      const status = await getStorageStatus()
      socket.emit("storage:status", status)
      if (callback) callback({ success: true })
    })
  },

  onSubscribe(socket: Socket) {
    if (subscribers.has(socket.id)) {
      console.log(`[storage] subscriber already exists: ${socket.id}`)
      return
    }
    
    console.log(`[storage] subscriber added: ${socket.id}`)
    
    const subscriber: Subscriber = { socketId: socket.id }
    subscribers.set(socket.id, subscriber)
    
    // Initial status
    getStorageStatus().then((status) => {
      console.log('[storage] initial status:', status)
      socket.emit("storage:status", status)
    })
    
    // Poll for updates
    subscriber.pollInterval = setInterval(async () => {
      if (!subscribers.has(socket.id)) {
        clearInterval(subscriber.pollInterval!)
        return
      }
      
      try {
        const status = await getStorageStatus()
        socket.emit("storage:status", status)
      } catch (err) {
        console.error('[storage] poll error:', err)
      }
    }, POLL_INTERVAL_MS)
    
    socket.data.storageInterval = subscriber.pollInterval
  },

  onUnsubscribe(socket: Socket) {
    const subscriber = subscribers.get(socket.id)
    if (subscriber?.pollInterval) {
      clearInterval(subscriber.pollInterval)
    }
    subscribers.delete(socket.id)
    
    if (socket.data.storageInterval) {
      clearInterval(socket.data.storageInterval)
      delete socket.data.storageInterval
    }
    
    console.log(`[storage] subscriber removed: ${socket.id}`)
  },
}
