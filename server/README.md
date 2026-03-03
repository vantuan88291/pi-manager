# Pi Manager Server

Node.js backend server for Pi Manager - Raspberry Pi remote management dashboard.

## Quick Start

### Development (Local)

```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Edit .env - for local dev, leave TELEGRAM_BOT_TOKEN empty (dev mode)
# TELEGRAM_BOT_TOKEN=
# ADMIN_TELEGRAM_ID=your-telegram-id

# Start server
npm run dev
```

Server runs on `http://localhost:3001`

### Production (with Telegram)

1. **Create Telegram Bot**
   - Open Telegram, search for `@BotFather`
   - Send `/newbot` and follow instructions
   - Copy the bot token

2. **Setup .env**
   ```env
   PORT=3001
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ALLOWED_ORIGINS=https://your-domain.com
   ADMIN_TELEGRAM_ID=600843385
   ```

3. **Configure Whitelist**
   - Edit `src/config/whitelist.json`
   - Add allowed Telegram user IDs:
   ```json
   [600843385, 7441186402]
   ```

4. **Start server**
   ```bash
   npm run build
   npm start
   ```

5. **Expose with Cloudflare Tunnel** (optional)
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express + Socket.IO bootstrap
│   ├── socket/
│   │   ├── index.ts          # Socket.IO setup + auth middleware
│   │   ├── types.ts          # Server socket module types
│   │   └── modules/
│   │       └── system.ts     # System stats module
│   ├── auth/
│   │   ├── telegram.ts       # Telegram initData validation
│   │   └── whitelist.ts      # User whitelist (file-based)
│   └── config/
│       └── whitelist.json    # Allowed Telegram user IDs
└── public/                   # Static frontend build (production)
```

## Socket.IO Modules

Each feature is a self-contained module:

```typescript
// server/src/socket/modules/example.ts
import type { ServerSocketModule } from "../types.js"

export const exampleModule: ServerSocketModule = {
  name: "example",
  
  register(socket, io) {
    socket.on("example:action", async (data) => {
      // Handle action
      socket.emit("example:result", { success: true })
    })
  },
  
  onSubscribe(socket) {
    // Start polling/streaming
  },
  
  onUnsubscribe(socket) {
    // Cleanup
  },
}
```

## API Endpoints

### REST

- `GET /api/health` - Health check
- `GET /` - Static frontend (production)

### WebSocket (Socket.IO)

#### Auth Flow
1. Client connects with Telegram `initData` (or session token for reconnect)
2. Server validates initData with Telegram Bot API
3. Server checks whitelist
4. Server creates session token and sends `auth:success`
5. Client stores token for reconnection

#### Events

**System Module:**
- `system:subscribe` - Subscribe to system stats
- `system:stats` - CPU, memory, disk, network (every 2s)
- `system:info` - Hostname, OS, hardware info (once)
- `system:reboot` - Reboot Pi (destructive, requires confirmation)

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3001 | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - | No* |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:8081 | No |
| `ADMIN_TELEGRAM_ID` | Admin user ID (auto-added to whitelist) | - | No |

\* Required for production. Leave empty for dev mode (no auth).

## Development

```bash
# Run with watch mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Lint
npm run lint
```

## Testing

```bash
# Test WebSocket connection
# Use browser console or Socket.IO client

const socket = io("http://localhost:3001")
socket.on("connect", () => console.log("Connected!"))
socket.on("auth:success", (data) => console.log("Auth success:", data))
socket.emit("module:subscribe", { module: "system" })
socket.on("system:stats", (stats) => console.log("Stats:", stats))
```

## Security Notes

- **Dev mode**: No auth required when `TELEGRAM_BOT_TOKEN` is empty
- **Production**: Always set bot token and configure whitelist
- **Whitelist**: Only Telegram user IDs in `whitelist.json` can connect
- **Session tokens**: Valid for 24 hours, stored in memory

## License

MIT

## NVMe Storage Module Setup

### Sudo Configuration (Required)

The storage module requires `sudo` to access NVMe S.M.A.R.T. data. Configure passwordless sudo:

1. **Edit sudoers file:**
   ```bash
   sudo visudo
   ```

2. **Add this line** (replace `pi` with your username):
   ```
   pi ALL=(ALL) NOPASSWD: /usr/sbin/nvme smart-log /dev/nvme0n1 -o json
   pi ALL=(ALL) NOPASSWD: /usr/sbin/nvme list -o json
   ```

3. **Or add to a group** (recommended):
   ```
   %openclaw ALL=(ALL) NOPASSWD: /usr/sbin/nvme smart-log /dev/nvme0n1 -o json
   %openclaw ALL=(ALL) NOPASSWD: /usr/sbin/nvme list -o json
   ```

### Test
```bash
sudo /usr/sbin/nvme smart-log /dev/nvme0n1 -o json
```

Should return JSON without password prompt.
