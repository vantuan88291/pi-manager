import { spawn } from "node:child_process"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { 
  BluetoothDevice, 
  BluetoothStatus, 
  BluetoothPairRequest,
  BluetoothPairResponse,
  BluetoothConnectRequest,
  BluetoothConnectResponse 
} from "../../../../shared/types/bluetooth.js"

const POLL_INTERVAL_MS = 5000
const SCAN_DURATION_MS = 15000  // 15 seconds

interface Subscriber {
  socketId: string
  scanInterval?: NodeJS.Timeout
}

const subscribers = new Map<string, Subscriber>()
let isScanning = false
let scanTimeout: NodeJS.Timeout | null = null

function parseDevices(output: string): BluetoothDevice[] {
  const lines = output.trim().split('\n')
  const devices: BluetoothDevice[] = []
  let currentDevice: Partial<BluetoothDevice> = {}
  
  for (const line of lines) {
    if (line.startsWith('Device ')) {
      if (currentDevice.mac) {
        devices.push(currentDevice as BluetoothDevice)
      }
      
      const match = line.match(/Device\s+([A-F0-9:]+)\s+(.+)/)
      if (match) {
        currentDevice = {
          mac: match[1],
          name: match[2] || null,
          paired: false,
          connected: false,
          type: null,
          rssi: null,
        }
      }
    } else if (line.includes('Paired:')) {
      currentDevice.paired = line.includes('yes')
    } else if (line.includes('Connected:')) {
      currentDevice.connected = line.includes('yes')
    } else if (line.includes('RSSI:')) {
      const rssiMatch = line.match(/RSSI:\s+(-?\d+)/)
      if (rssiMatch) {
        currentDevice.rssi = parseInt(rssiMatch[1])
      }
    }
  }
  
  if (currentDevice.mac) {
    devices.push(currentDevice as BluetoothDevice)
  }
  
  return devices
}

async function getPowerState(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['show'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const powered = output.includes('Powered: yes')
      resolve(powered)
    })
    
    proc.on('error', () => resolve(false))
  })
}

async function getBluetoothStatus(): Promise<BluetoothStatus> {
  const powered = await getPowerState()
  
  if (!powered) {
    return {
      powered: false,
      discovering: false,
      devices: [],
    }
  }
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['devices'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const devices = parseDevices(output)
      
      const discoverProc = spawn('bluetoothctl', ['show'])
      let discoverOutput = ''
      discoverProc.stdout.on('data', (data) => { discoverOutput += data.toString() })
      
      discoverProc.on('close', () => {
        const discovering = discoverOutput.includes('Discovering: yes')
        
        resolve({
          powered: true,
          discovering,
          devices,
        })
      })
    })
    
    proc.on('error', () => {
      resolve({
        powered: true,
        discovering: false,
        devices: [],
      })
    })
  })
}

async function startScan(): Promise<{ success: boolean; error?: string }> {
  if (isScanning) {
    return { success: false, error: "Already scanning" }
  }
  
  isScanning = true
  console.log('[bluetooth] starting scan...')
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['scan', 'on'])
    let errorOutput = ''
    
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[bluetooth] scan started')
        resolve({ success: true })
      } else {
        console.error('[bluetooth] scan start failed:', errorOutput)
        resolve({ success: false, error: errorOutput || 'Failed to start scan' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] scan error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
    
    // Auto-stop after SCAN_DURATION_MS
    scanTimeout = setTimeout(async () => {
      await stopScan()
    }, SCAN_DURATION_MS)
  })
}

async function stopScan(): Promise<void> {
  if (!isScanning) return
  
  console.log('[bluetooth] stopping scan...')
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['scan', 'off'])
    
    proc.on('close', () => {
      isScanning = false
      console.log('[bluetooth] scan stopped')
      resolve()
    })
    
    proc.on('error', () => {
      isScanning = false
      resolve()
    })
    
    if (scanTimeout) {
      clearTimeout(scanTimeout)
      scanTimeout = null
    }
  })
}

async function pairDevice(mac: string, pin?: string): Promise<BluetoothPairResponse> {
  console.log(`[bluetooth] pairing with ${mac}${pin ? ' (with PIN)' : ''}`)
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['pair', mac])
    let output = ''
    let errorOutput = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0 || output.includes('Pairing successful')) {
        console.log(`[bluetooth] paired with ${mac}`)
        resolve({ success: true })
      } else {
        const errorMsg = errorOutput.trim() || 'Pairing failed'
        console.error(`[bluetooth] pair failed: ${errorMsg}`)
        resolve({ success: false, error: errorMsg })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] pair error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
  })
}

async function connectDevice(mac: string): Promise<BluetoothConnectResponse> {
  console.log(`[bluetooth] connecting to ${mac}`)
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['connect', mac])
    let output = ''
    let errorOutput = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0 || output.includes('Connection successful')) {
        console.log(`[bluetooth] connected to ${mac}`)
        resolve({ success: true })
      } else {
        const errorMsg = errorOutput.trim() || 'Connection failed'
        console.error(`[bluetooth] connect failed: ${errorMsg}`)
        resolve({ success: false, error: errorMsg })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] connect error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
  })
}

async function disconnectDevice(mac: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[bluetooth] disconnecting ${mac}`)
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['disconnect', mac])
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[bluetooth] disconnected ${mac}`)
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Disconnect failed' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] disconnect error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
  })
}

async function unpairDevice(mac: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[bluetooth] unpairing ${mac}`)
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', ['remove', mac])
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[bluetooth] unpaired ${mac}`)
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Unpair failed' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] unpair error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
  })
}

async function togglePower(turnOn: boolean): Promise<{ success: boolean; error?: string }> {
  const command = turnOn ? 'power on' : 'power off'
  console.log(`[bluetooth] ${command}`)
  
  return new Promise((resolve) => {
    const proc = spawn('bluetoothctl', [command])
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[bluetooth] ${command} successful`)
        resolve({ success: true })
      } else {
        resolve({ success: false, error: `Failed to ${command}` })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[bluetooth] power toggle error:', err)
      resolve({ success: false, error: 'bluetoothctl command failed' })
    })
  })
}

export const bluetoothModule: ServerSocketModule = {
  name: "bluetooth",

  register(socket: Socket, io: Server) {
    socket.on("bluetooth:status", async () => {
      const status = await getBluetoothStatus()
      socket.emit("bluetooth:status", status)
    })

    socket.on("bluetooth:scan", async (callback?: (response: { success: boolean; error?: string }) => void) => {
      const result = await startScan()
      if (callback) callback(result)
      
      // Emit status update after 3 seconds (give time to find devices)
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 3000)
    })

    socket.on("bluetooth:stop_scan", async () => {
      await stopScan()
      const status = await getBluetoothStatus()
      socket.emit("bluetooth:status", status)
    })

    socket.on("bluetooth:pair", async (data: BluetoothPairRequest, callback: (response: BluetoothPairResponse) => void) => {
      const result = await pairDevice(data.mac, data.pin)
      callback(result)
      
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 1000)
    })

    socket.on("bluetooth:connect", async (data: BluetoothConnectRequest, callback: (response: BluetoothConnectResponse) => void) => {
      const result = await connectDevice(data.mac)
      callback(result)
      
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 1000)
    })

    socket.on("bluetooth:disconnect", async (data: BluetoothConnectRequest, callback: (response: { success: boolean; error?: string }) => void) => {
      const result = await disconnectDevice(data.mac)
      callback(result)
      
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 1000)
    })

    socket.on("bluetooth:unpair", async (data: BluetoothConnectRequest, callback: (response: { success: boolean; error?: string }) => void) => {
      const result = await unpairDevice(data.mac)
      callback(result)
      
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 1000)
    })

    socket.on("bluetooth:toggle_power", async (data: { powered: boolean }, callback: (response: { success: boolean; error?: string }) => void) => {
      const result = await togglePower(data.powered)
      callback(result)
      
      setTimeout(async () => {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      }, 1000)
    })
  },

  onSubscribe(socket: Socket) {
    if (subscribers.has(socket.id)) {
      console.log(`[bluetooth] subscriber already exists: ${socket.id}`)
      return
    }
    
    console.log(`[bluetooth] subscriber added: ${socket.id}`)
    
    const subscriber: Subscriber = { socketId: socket.id }
    subscribers.set(socket.id, subscriber)
    
    // Initial status
    getBluetoothStatus().then((status) => {
      console.log('[bluetooth] initial status:', status)
      socket.emit("bluetooth:status", status)
    })
    
    // Poll for updates
    subscriber.scanInterval = setInterval(async () => {
      if (!subscribers.has(socket.id)) {
        clearInterval(subscriber.scanInterval!)
        return
      }
      
      try {
        const status = await getBluetoothStatus()
        socket.emit("bluetooth:status", status)
      } catch (err) {
        console.error('[bluetooth] poll error:', err)
      }
    }, POLL_INTERVAL_MS)
    
    socket.data.bluetoothInterval = subscriber.scanInterval
  },

  onUnsubscribe(socket: Socket) {
    const subscriber = subscribers.get(socket.id)
    if (subscriber?.scanInterval) {
      clearInterval(subscriber.scanInterval)
    }
    subscribers.delete(socket.id)
    
    if (socket.data.bluetoothInterval) {
      clearInterval(socket.data.bluetoothInterval)
      delete socket.data.bluetoothInterval
    }
    
    if (subscribers.size === 0 && isScanning) {
      stopScan()
    }
    
    console.log(`[bluetooth] subscriber removed: ${socket.id}`)
  },
}
