import { Server, Socket } from "socket.io"

export interface ServerSocketModule {
  name: string
  register(socket: Socket, io: Server): void
  onSubscribe(socket: Socket): void
  onUnsubscribe(socket: Socket): void
}
