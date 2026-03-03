// Audio output device
export interface AudioDevice {
  id: string
  name: string
  type: "speaker" | "headphone" | "hdmi" | "bluetooth" | "other"
}

// Audio status
export interface AudioStatus {
  volume: number  // 0-100
  muted: boolean
  outputDevice: AudioDevice | null
  availableDevices: AudioDevice[]
}

// Audio set volume request
export interface AudioSetVolumeRequest {
  volume: number  // 0-100
}

// Audio set volume response (for ack)
export interface AudioSetVolumeResponse {
  success: boolean
  error?: string
}

// Audio set output request
export interface AudioSetOutputRequest {
  deviceId: string
}

// Audio set output response (for ack)
export interface AudioSetOutputResponse {
  success: boolean
  error?: string
}

// Audio test sound response (for ack)
export interface AudioTestSoundResponse {
  success: boolean
  error?: string
}
