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

console.log("[config] allowed origins:", ALLOWED_ORIGINS)

const app = express()

// CORS config - allow all origins including cloudflare tunnels
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)
    // Allow all *.trycloudflare.com domains
    if (origin.includes('trycloudflare.com')) return callback(null, true)
    // Check against allowed origins list
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}))

app.use(express.json())

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

// System reboot endpoint (requires sudo)
app.post("/api/system/reboot", async (_req, res) => {
  console.log("[api] reboot requested")
  
  const { spawn } = await import("node:child_process")
  
  // Execute sudo reboot
  const rebootProc = spawn("sudo", ["reboot"])
  
  rebootProc.on("close", (code) => {
    if (code === 0) {
      console.log("[api] reboot initiated")
      res.json({ success: true, message: "System is rebooting" })
    } else {
      console.error("[api] reboot failed")
      res.status(500).json({ success: false, error: "Reboot failed" })
    }
  })
  
  rebootProc.on("error", (err) => {
    console.error("[api] reboot error:", err)
    res.status(500).json({ success: false, error: "Reboot command failed" })
  })
})

// Serve static frontend (production)
const publicDir = path.join(__dirname, "../public")
app.use(express.static(publicDir))
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins for WebSocket
      if (!origin || origin.includes('trycloudflare.com')) {
        return callback(null, true)
      }
      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        return callback(null, true)
      }
      return callback(null, true) // Allow all for now
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25_000,
  pingTimeout: 20_000,
})

setupSocketServer(io)

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[pi-manager] server listening on http://0.0.0.0:${PORT}`)
  console.log(`[pi-manager] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`)
})
