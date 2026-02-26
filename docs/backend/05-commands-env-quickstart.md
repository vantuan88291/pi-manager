# Commands, Environment Variables, Quick Start

> Split backend docs (Commands, env vars, quick start).

## 13. Commands

```bash
# Frontend — development
yarn install              # install dependencies
yarn start                # start Expo dev server (all platforms)
yarn web                  # start web dev server only (port 8081)
yarn test                 # run tests
yarn lint                 # lint
npm run gscreen <Name>    # generate screen
npm run gcomponent <Name> # generate component

# Frontend — production build
npx expo export --platform web    # outputs to dist/

# Server — development
cd server
npm install
npm run dev               # start with tsx watch (auto-reload)

# Server — production
cd server
npm run build             # compile TypeScript → dist/
npm start                 # node dist/index.js

# Tunnel
cloudflared tunnel --url http://localhost:3001
```

## 15. Environment Variables

```env
# Frontend (.env)
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001

# Server (server/.env)
PORT=3001
TELEGRAM_BOT_TOKEN=xxxx
ALLOWED_ORIGINS=http://localhost:8081,https://pi.example.com
ADMIN_TELEGRAM_ID=123456789      # first admin user (auto-added to whitelist on first run)
```

---

## Appendix F: Quick Start — Run Locally in 5 Minutes

### Prerequisites

- Node.js >= 20
- Yarn (for frontend) and npm (for server)
- A Raspberry Pi with camera module (for camera features; other features work on any machine)
- Optional: Telegram bot token (for auth; dev mode works without it)

### Step-by-step

```bash
# 1. Clone and install frontend
cd /path/to/pi-manager
yarn install

# 2. Set up server
mkdir -p server/src/config
cd server
npm install
cp .env.example .env   # or create manually:
#   PORT=3001
#   TELEGRAM_BOT_TOKEN=       (leave empty for dev)
#   ALLOWED_ORIGINS=http://localhost:8081
#   ADMIN_TELEGRAM_ID=        (leave empty for dev)
cd ..

# 3. Create shared types (if not yet created)
mkdir -p shared/types shared/constants

# 4. Start server (terminal 1)
cd server
npm run dev
# Expected output:
#   [whitelist] Empty whitelist created. Set ADMIN_TELEGRAM_ID...
#   [pi-manager] server listening on http://localhost:3001
#   [pi-manager] allowed origins: http://localhost:8081

# 5. Start frontend (terminal 2)
cd /path/to/pi-manager
yarn web
# Expected output:
#   Starting Metro Bundler
#   Web is ready at http://localhost:8081

# 6. Open browser
#   → http://localhost:8081
#   → In dev mode (no Telegram), auth is bypassed automatically
#   → You should see the TelegramAuthScreen briefly, then DashboardScreen

# 7. Verify socket connection
#   → Browser DevTools → Network → WS tab
#   → You should see a WebSocket connection to localhost:3001
#   → Messages: auth:success, system:stats (every 2s)
```

### Verification checklist

| Check | How to verify | Expected |
|-------|---------------|----------|
| Server running | `curl http://localhost:3001/api/health` | `{"status":"ok","uptime":...}` |
| Frontend running | Open `http://localhost:8081` | App loads, no white screen |
| Socket connected | Browser DevTools → WS tab | WebSocket to `:3001`, messages flowing |
| System stats | Dashboard screen | CPU %, RAM, disk values updating every 2s |
| Auth bypass (dev) | Console logs | `[socket] connected: Developer (0)` |

### Running on actual Pi (with Telegram)

```bash
# Same steps as above, but additionally:

# 1. Set real env vars
echo 'TELEGRAM_BOT_TOKEN=123456:ABC...' >> server/.env
echo 'ADMIN_TELEGRAM_ID=your_telegram_id' >> server/.env
echo 'ALLOWED_ORIGINS=http://localhost:8081,https://pi.example.com' >> server/.env

# 2. Build frontend for production
npx expo export --platform web
cp -r dist/* server/public/

# 3. Build & start server in production mode
cd server
npm run build
NODE_ENV=production npm start

# 4. Start Cloudflare Tunnel (separate terminal)
cloudflared tunnel run pi-manager

# 5. Open Telegram → your bot → tap "Open Pi Manager"
#    → Mini App loads → auth with Telegram → Dashboard appears
```

