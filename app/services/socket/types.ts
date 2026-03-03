import { Socket } from "socket.io-client"

export interface SocketModule {
  name: string
  register(socket: Socket): void
  cleanup(): void
  subscribe(): void
  unsubscribe(): void
}

export interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error"
  isAuthenticated: boolean
  user: TelegramUser | null
  error: string | null
}

export interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}
