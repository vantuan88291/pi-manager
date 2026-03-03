import { spawn } from "node:child_process"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { WiFiNetwork, WiFiConnection, WiFiStatus, WiFiConnectRequest } from "../../../../shared/types/wifi.js"

const POLL_INTERVAL_MS = 5000
const SCAN_COOLDOWN_MS = 10000

interface Subscriber {
  socketId: string
  lastScan: number
  lastNetworks: WiFiNetwork[]
  scanInterval?: NodeJS.Timeout
}

const subscribers = new Map<string, Subscriber>()
let isScanning = false

function parseWifiList(output: string): WiFiNetwork[] {
  const lines = output.trim().split('\n')
  const networks: WiFiNetwork[] = []
  
  for (const line of lines) {
    const parts = line.split(':')
    if (parts.length >= 6) {
      const [ssid, bssid, , , , signalStr, security] = parts
      if (ssid && bssid) {
        networks.push({
          ssid: ssid.replace(/^\\x00/, '') || '<Hidden SSID>',
          bssid,
          signal: parseInt(signalStr) || 0,
          security: security ? [security] : ['Open'],
          channel: 0,
          frequency: 0,
        })
      }
    }
  }
  
  const unique = new Map(networks.map(n => [n.bssid, n]))
  return Array.from(unique.values()).sort((a, b) => b.signal - a.signal)
}

async function getCurrentConnection(): Promise<WiFiConnection> {
  return new Promise((resolve) => {
    const proc = spawn('nmcli', ['-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi'])
    
    let output = ''
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', async () => {
      const lines = output.trim().split('\n')
      const activeLine = lines.find(l => l.startsWith('yes:'))
      
      if (activeLine) {
        const [, ssid] = activeLine.split(':')
        const cleanSSID = ssid?.replace(/^\\x00/, '') || null
        
        const ipProc = spawn('nmcli', ['-t', '-f', 'IP4.ADDRESS', 'dev', 'wlan0'])
        let ipOutput = ''
        ipProc.stdout.on('data', (data) => { ipOutput += data.toString() })
        
        ipProc.on('close', () => {
          const ipMatch = ipOutput.match(/(\d+\.\d+\.\d+\.\d+)/)
          const ip = ipMatch ? ipMatch[1] : null
          
          const macProc = spawn('nmcli', ['-t', '-f', 'GENERAL.HWADDR', 'dev', 'wlan0'])
          let macOutput = ''
          macProc.stdout.on('data', (data) => { macOutput += data.toString() })
          
          macProc.on('close', () => {
            const mac = macOutput.trim() || 'unknown'
            
            getSignalForSSID(cleanSSID).then(signal => {
              resolve({
                ssid: cleanSSID,
                bssid: null,
                ip: ip,
                mac: mac,
                status: 'connected',
                signal: signal,
              })
            })
          })
        })
      } else {
        const macProc = spawn('nmcli', ['-t', '-f', 'GENERAL.HWADDR', 'dev', 'wlan0'])
        let macOutput = ''
        macProc.stdout.on('data', (data) => { macOutput += data.toString() })
        
        macProc.on('close', () => {
          const mac = macOutput.trim() || 'unknown'
          resolve({
            ssid: null,
            bssid: null,
            ip: null,
            mac: mac,
            status: 'disconnected',
            signal: null,
          })
        })
      }
    })
    
    proc.on('error', () => {
      resolve({ ssid: null, bssid: null, ip: null, mac: 'unknown', status: 'disconnected', signal: null })
    })
  })
}

async function getSignalForSSID(ssid: string | null): Promise<number | null> {
  if (!ssid) return null
  
  return new Promise((resolve) => {
    const proc = spawn('nmcli', ['-t', '-f', 'SSID,SIGNAL', 'dev', 'wifi'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const lines = output.trim().split('\n')
      const activeLine = lines.find(l => {
        const [lineSsid] = l.split(':')
        return lineSsid === ssid
      })
      
      if (activeLine) {
        const [, signalStr] = activeLine.split(':')
        resolve(parseInt(signalStr) || 0)
      } else {
        resolve(0)
      }
    })
    
    proc.on('error', () => resolve(0))
  })
}

async function scanNetworks(): Promise<WiFiNetwork[]> {
  if (isScanning) return []
  
  isScanning = true
  console.log('[wifi] scanning for networks...')
  
  return new Promise((resolve) => {
    const proc = spawn('nmcli', ['-t', '-f', 'SSID,BSSID,MODE,FREQ,RATE,SIGNAL,SECURITY', 'dev', 'wifi', 'list'])
    
    let output = ''
    let errorOutput = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      isScanning = false
      if (code === 0) {
        const networks = parseWifiList(output)
        console.log(`[wifi] found ${networks.length} networks`)
        resolve(networks)
      } else {
        console.error('[wifi] scan error:', errorOutput)
        resolve([])
      }
    })
    
    proc.on('error', (err) => {
      isScanning = false
      console.error('[wifi] scan failed:', err)
      resolve([])
    })
  })
}

async function connectToNetwork(ssid: string, password?: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const args = ['dev', 'wifi', 'connect', ssid]
    if (password) args.push('password', password)
    
    const proc = spawn('nmcli', args)
    let output = ''
    let errorOutput = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[wifi] connected to ${ssid}`)
        resolve({ success: true })
      } else {
        const errorMsg = errorOutput.trim() || 'Failed to connect'
        console.error(`[wifi] connect failed: ${errorMsg}`)
        resolve({ success: false, error: errorMsg })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[wifi] connect error:', err)
      resolve({ success: false, error: 'nmcli command failed' })
    })
  })
}

export const wifiModule: ServerSocketModule = {
  name: "wifi",

  register(socket: Socket, io: Server) {
    socket.on("wifi:scan", async () => {
      const subscriber = subscribers.get(socket.id)
      if (!subscriber) {
        socket.emit("error", { module: "wifi", code: "NOT_SUBSCRIBED", message: "Subscribe to wifi module first" })
        return
      }
      
      const now = Date.now()
      if (now - subscriber.lastScan < SCAN_COOLDOWN_MS) {
        socket.emit("wifi:scan_result", { networks: [], error: "Scan cooldown" })
        return
      }
      
      subscriber.lastScan = now
      const networks = await scanNetworks()
      subscriber.lastNetworks = networks  // Cache networks
      
      socket.emit("wifi:scan_result", { networks })
    })

    socket.on("wifi:connect", async (data: WiFiConnectRequest, callback) => {
      console.log(`[wifi] connect request: ${data.ssid}`)
      
      if (!data.ssid) {
        callback({ success: false, error: "SSID is required" })
        return
      }
      
      const result = await connectToNetwork(data.ssid, data.password)
      callback(result)
      
      setTimeout(async () => {
        const connection = await getCurrentConnection()
        const networks = await scanNetworks()
        
        socket.emit("wifi:status", {
          connected: connection.status === "connected",
          ssid: connection.ssid,
          ip: connection.ip,
          mac: connection.mac,
          signal: connection.signal,
          networks,
        })
      }, 2000)
    })

    socket.on("wifi:status", async () => {
      const connection = await getCurrentConnection()
      const networks = await scanNetworks()
      
      socket.emit("wifi:status", {
        connected: connection.status === "connected",
        ssid: connection.ssid,
        ip: connection.ip,
        mac: connection.mac,
        signal: connection.signal,
        networks,
      })
    })
  },

  onSubscribe(socket: Socket) {
    if (subscribers.has(socket.id)) return
    
    console.log(`[wifi] subscriber added: ${socket.id}`)
    
    const subscriber: Subscriber = {
      socketId: socket.id,
      lastScan: 0,
      lastNetworks: [],
    }
    subscribers.set(socket.id, subscriber)
    
    // Initial status
    getCurrentConnection().then(async (connection) => {
      console.log('[wifi] initial connection:', connection)
      const networks = await scanNetworks()
      subscriber.lastNetworks = networks
      
      socket.emit("wifi:status", {
        connected: connection.status === "connected",
        ssid: connection.ssid,
        ip: connection.ip,
        mac: connection.mac,
        signal: connection.signal,
        networks,
      })
    })
    
    // Poll for updates - ONLY connection info, keep cached networks
    subscriber.scanInterval = setInterval(async () => {
      if (!subscribers.has(socket.id)) {
        clearInterval(subscriber.scanInterval!)
        return
      }
      
      try {
        const connection = await getCurrentConnection()
        
        // Send connection update WITH cached networks (don't clear!)
        socket.emit("wifi:status", {
          connected: connection.status === "connected",
          ssid: connection.ssid,
          ip: connection.ip,
          mac: connection.mac,
          signal: connection.signal,
          networks: subscriber.lastNetworks,  // Use cached networks
        })
      } catch (err) {
        console.error('[wifi] poll error:', err)
      }
    }, POLL_INTERVAL_MS)
    
    socket.data.wifiInterval = subscriber.scanInterval
  },

  onUnsubscribe(socket: Socket) {
    const subscriber = subscribers.get(socket.id)
    if (subscriber?.scanInterval) {
      clearInterval(subscriber.scanInterval)
    }
    subscribers.delete(socket.id)
    
    if (socket.data.wifiInterval) {
      clearInterval(socket.data.wifiInterval)
      delete socket.data.wifiInterval
    }
    
    console.log(`[wifi] subscriber removed: ${socket.id}`)
  },
}
