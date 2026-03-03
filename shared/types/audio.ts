export interface AudioState {
  volume: number // 0–100
  muted: boolean
  output: string
  availableOutputs: Array<{
    id: string
    name: string
    type: "hdmi" | "analog" | "bluetooth" | "usb"
  }>
}
