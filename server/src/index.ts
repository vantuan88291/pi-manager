import "dotenv/config"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import express from "express"
import { Server } from "socket.io"
import { setupSocketServer } from "./socket/index.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT) || 3001
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8081")
  .split(",")
  .map((s) => s.trim())

const app = express()
app.use(cors({ origin: ALLOWED_ORIGINS }))

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

const publicDir = path.join(__dirname, "../public")
app.use(express.static(publicDir))
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
  transports: ["websocket"],
  pingInterval: 25_000,
  pingTimeout: 20_000,
})

setupSocketServer(io)

server.listen(PORT, () => {
  console.log(`[pi-manager] server listening on http://localhost:${PORT}`)
  console.log(`[pi-manager] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`)
})
