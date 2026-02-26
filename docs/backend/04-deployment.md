# Production Deployment

> Split backend docs (Deployment) + see Cloudflare appendix for full tunnel config.

## 14. Production Deployment

### 14.1 Build Pipeline

```
1. Build frontend:   npx expo export --platform web → generates /dist (static HTML/JS/CSS)
2. Copy dist/ into:  server/public/                  (Express serves this as static files)
3. Build server:     cd server && npm run build       → compiles TS to server/dist/
4. Start server:     node server/dist/index.js        → single process on port 3001
```

### 14.2 Express Static Serving

The server serves the frontend build as static files from `server/public/`.
All non-API routes fall through to `index.html` (SPA routing).

```typescript
// server/src/index.ts — production static hosting
import express from "express"
import path from "path"

const app = express()

// Serve static frontend build
app.use(express.static(path.join(__dirname, "../public")))

// SPA fallback: any non-API GET → index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

// Socket.IO attaches to the same HTTP server
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } })
server.listen(PORT)
```

### 14.3 Cloudflare Tunnel Setup

```bash
# Install cloudflared on Pi
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Login (one-time)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create pi-manager

# Run tunnel (points to local server)
cloudflared tunnel --url http://localhost:3001 run pi-manager
```

The tunnel provides an HTTPS URL (e.g., `https://pi-manager.example.com`) that Telegram
requires for Mini App WebApp URLs.

For production (named tunnel + config file + systemd), see:
[`appendix-d-cloudflare-tunnel.md`](./appendix-d-cloudflare-tunnel.md).

### 14.4 Process Management (systemd)

Two systemd services on the Pi:

**pi-manager-server.service** — the Node.js server:
```
ExecStart=/usr/bin/node /home/pi/pi-manager/server/dist/index.js
Restart=always
Environment=NODE_ENV=production
```

**pi-manager-tunnel.service** — the Cloudflare tunnel:
```
ExecStart=/usr/local/bin/cloudflared tunnel run pi-manager
Restart=always
```

Both set to `enable` so they auto-start on boot.

### 14.5 Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Frontend | Expo dev server (port 8081), hot reload | Static build in `server/public/` |
| Server | `tsx watch` (auto-reload on save) | Compiled JS via `node dist/index.js` |
| URL | `http://localhost:8081` (web) | `https://pi.example.com` (Cloudflare) |
| Socket URL | `http://localhost:3001` | Same origin (relative `/socket.io/`) |
| HTTPS | Not needed | Provided by Cloudflare Tunnel |
| Process | Terminal / manual | systemd + auto-restart |

