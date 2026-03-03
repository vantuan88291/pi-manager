import { spawn } from "node:child_process"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type { 
  AudioStatus, 
  AudioDevice,
  AudioSetVolumeRequest,
  AudioSetVolumeResponse,
  AudioSetOutputRequest,
  AudioSetOutputResponse,
  AudioTestSoundResponse
} from "../../../../shared/types/audio.js"

const POLL_INTERVAL_MS = 3000

interface Subscriber {
  socketId: string
  pollInterval?: NodeJS.Timeout
}

const subscribers = new Map<string, Subscriber>()

// Get current volume (0-100)
async function getVolume(): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('amixer', ['get', 'Master'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      // Parse: Front Left: Playback 45678 [67%]
      const match = output.match(/Playback\s+\d+\s+\[(\d+)%\]/)
      if (match) {
        resolve(parseInt(match[1]))
      } else {
        resolve(0)
      }
    })
    
    proc.on('error', () => resolve(0))
  })
}

// Get mute state
async function getMuted(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('amixer', ['get', 'Master'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const muted = output.includes('[off]')
      resolve(muted)
    })
    
    proc.on('error', () => resolve(false))
  })
}

// Get available audio devices
async function getAvailableDevices(): Promise<AudioDevice[]> {
  const devices: AudioDevice[] = []
  
  // Always add default devices
  devices.push({ id: "speaker", name: "3.5mm Jack", type: "speaker" })
  devices.push({ id: "hdmi", name: "HDMI", type: "hdmi" })
  
  // Try to get Bluetooth devices
  try {
    const btProc = spawn('pactl', ['list', 'sinks'])
    let output = ''
    
    btProc.stdout.on('data', (data) => { output += data.toString() })
    
    btProc.on('close', () => {
      const lines = output.split('\n')
      let currentName = ''
      let currentDesc = ''
      
      for (const line of lines) {
        if (line.includes('Name:')) {
          currentName = line.split(':')[1]?.trim() || ''
        }
        if (line.includes('Description:')) {
          currentDesc = line.split(':')[1]?.trim() || ''
          if (currentName.includes('bluez')) {
            devices.push({
              id: currentName,
              name: currentDesc || 'Bluetooth Device',
              type: "bluetooth",
            })
          }
        }
      }
    })
  } catch (e) {
    // pactl not available, skip
  }
  
  return devices
}

// Get current output device
async function getOutputDevice(): Promise<AudioDevice | null> {
  try {
    const proc = spawn('pactl', ['get', 'default-sink'])
    let output = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    
    proc.on('close', () => {
      const sinkName = output.trim()
      if (sinkName.includes('bluez')) {
        return { id: sinkName, name: "Bluetooth Device", type: "bluetooth" }
      } else if (sinkName.includes('hdmi')) {
        return { id: "hdmi", name: "HDMI", type: "hdmi" }
      } else {
        return { id: "speaker", name: "3.5mm Jack", type: "speaker" }
      }
    })
    
    proc.on('error', () => null)
  } catch (e) {
    return { id: "speaker", name: "3.5mm Jack", type: "speaker" }
  }
  
  return null
}

// Get full audio status
async function getAudioStatus(): Promise<AudioStatus> {
  const [volume, muted, outputDevice, availableDevices] = await Promise.all([
    getVolume(),
    getMuted(),
    getOutputDevice(),
    getAvailableDevices(),
  ])
  
  return {
    volume,
    muted,
    outputDevice,
    availableDevices,
  }
}

// Set volume (0-100)
async function setVolume(volume: number): Promise<AudioSetVolumeResponse> {
  const clampedVolume = Math.max(0, Math.min(100, volume))
  console.log(`[audio] setting volume to ${clampedVolume}%`)
  
  return new Promise((resolve) => {
    const proc = spawn('amixer', ['set', 'Master', `${clampedVolume}%`])
    let errorOutput = ''
    
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[audio] volume set to ${clampedVolume}%`)
        resolve({ success: true })
      } else {
        console.error('[audio] set volume failed:', errorOutput)
        resolve({ success: false, error: errorOutput || 'Failed to set volume' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[audio] set volume error:', err)
      resolve({ success: false, error: 'amixer command failed' })
    })
  })
}

// Toggle mute
async function toggleMute(): Promise<AudioSetVolumeResponse> {
  console.log('[audio] toggling mute')
  
  return new Promise((resolve) => {
    const proc = spawn('amixer', ['set', 'Master', 'toggle'])
    let errorOutput = ''
    
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[audio] mute toggled')
        resolve({ success: true })
      } else {
        console.error('[audio] toggle mute failed:', errorOutput)
        resolve({ success: false, error: errorOutput || 'Failed to toggle mute' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[audio] toggle mute error:', err)
      resolve({ success: false, error: 'amixer command failed' })
    })
  })
}

// Set output device
async function setOutputDevice(deviceId: string): Promise<AudioSetOutputResponse> {
  console.log(`[audio] setting output device to ${deviceId}`)
  
  return new Promise((resolve) => {
    // Use pactl to set default sink
    const proc = spawn('pactl', ['set', 'default-sink', deviceId])
    let errorOutput = ''
    
    proc.stderr.on('data', (data) => { errorOutput += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[audio] output device set to ${deviceId}`)
        resolve({ success: true })
      } else {
        // Fallback: try amixer for basic speaker/hdmi
        console.log('[audio] pactl failed, trying amixer...')
        resolve({ success: false, error: 'Device switching not available. Use HDMI or 3.5mm Jack.' })
      }
    })
    
    proc.on('error', (err) => {
      console.error('[audio] set output error:', err)
      resolve({ success: false, error: 'pactl command failed' })
    })
  })
}

// Test sound (play a beep)
async function testSound(): Promise<AudioTestSoundResponse> {
  console.log('[audio] playing test sound')
  
  return new Promise((resolve) => {
    // Try to play a test sound using speaker-test
    const proc = spawn('speaker-test', ['-t', 'sine', '-f', '440', '-l', '1', '-D', 'default'])
    
    setTimeout(() => {
      proc.kill('SIGTERM')
      console.log('[audio] test sound completed')
      resolve({ success: true })
    }, 1000)
    
    proc.on('error', (err) => {
      console.error('[audio] test sound error:', err)
      resolve({ success: false, error: 'speaker-test not available' })
    })
  })
}

export const audioModule: ServerSocketModule = {
  name: "audio",

  register(socket: Socket, io: Server) {
    // Get status
    socket.on("audio:status", async () => {
      const status = await getAudioStatus()
      socket.emit("audio:status", status)
    })

    // Set volume (ack-only)
    socket.on("audio:set_volume", async (data: AudioSetVolumeRequest, callback: (response: AudioSetVolumeResponse) => void) => {
      const result = await setVolume(data.volume)
      callback(result)
      
      // Emit status update
      setTimeout(async () => {
        const status = await getAudioStatus()
        socket.emit("audio:status", status)
      }, 500)
    })

    // Toggle mute (ack-only)
    socket.on("audio:toggle_mute", async (callback: (response: AudioSetVolumeResponse) => void) => {
      const result = await toggleMute()
      callback(result)
      
      // Emit status update
      setTimeout(async () => {
        const status = await getAudioStatus()
        socket.emit("audio:status", status)
      }, 500)
    })

    // Set output device (ack-only)
    socket.on("audio:set_output", async (data: AudioSetOutputRequest, callback: (response: AudioSetOutputResponse) => void) => {
      const result = await setOutputDevice(data.deviceId)
      callback(result)
      
      // Emit status update
      setTimeout(async () => {
        const status = await getAudioStatus()
        socket.emit("audio:status", status)
      }, 500)
    })

    // Test sound (ack-only)
    socket.on("audio:test_sound", async (callback: (response: AudioTestSoundResponse) => void) => {
      const result = await testSound()
      callback(result)
    })
  },

  onSubscribe(socket: Socket) {
    if (subscribers.has(socket.id)) {
      console.log(`[audio] subscriber already exists: ${socket.id}`)
      return
    }
    
    console.log(`[audio] subscriber added: ${socket.id}`)
    
    const subscriber: Subscriber = { socketId: socket.id }
    subscribers.set(socket.id, subscriber)
    
    // Initial status
    getAudioStatus().then((status) => {
      console.log('[audio] initial status:', status)
      socket.emit("audio:status", status)
    })
    
    // Poll for updates
    subscriber.pollInterval = setInterval(async () => {
      if (!subscribers.has(socket.id)) {
        clearInterval(subscriber.pollInterval!)
        return
      }
      
      try {
        const status = await getAudioStatus()
        socket.emit("audio:status", status)
      } catch (err) {
        console.error('[audio] poll error:', err)
      }
    }, POLL_INTERVAL_MS)
    
    socket.data.audioInterval = subscriber.pollInterval
  },

  onUnsubscribe(socket: Socket) {
    const subscriber = subscribers.get(socket.id)
    if (subscriber?.pollInterval) {
      clearInterval(subscriber.pollInterval)
    }
    subscribers.delete(socket.id)
    
    if (socket.data.audioInterval) {
      clearInterval(socket.data.audioInterval)
      delete socket.data.audioInterval
    }
    
    console.log(`[audio] subscriber removed: ${socket.id}`)
  },
}
