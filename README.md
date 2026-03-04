# Pi Manager

Remote management dashboard for Raspberry Pi via Telegram Mini App.

## 🚀 Quick Start

### One-Command Deployment

```bash
# Build + start tunnel + start server
yarn start:full
```

This will:
1. Build web frontend
2. Start Cloudflare Quick Tunnel
3. Auto-update environment files with tunnel URL
4. Start backend server
5. Output tunnel URL for Telegram bot configuration

### Manual Steps

```bash
# 1. Build web frontend
yarn build:web

# 2. Start tunnel (auto-updates .env files)
yarn start:tunnel

# 3. Start backend server
cd server && npm run dev
```

## 📱 Telegram Bot Setup

### 1. Create Bot

1. Open Telegram → `@BotFather`
2. Send `/newbot`
3. Set bot name and username (must end with `bot`)
4. Save the BOT_TOKEN

### 2. Get Your Telegram ID

1. Open Telegram → `@userinfobot`
2. Send `/start`
3. Save your Telegram ID

### 3. Configure Bot

1. Get tunnel URL from `yarn start:full` output
2. In `@BotFather`, send `/setmenubutton`
3. Select your bot
4. Send tunnel URL
5. Set button text: `Open Pi Manager`

### 4. Update Configuration

**`server/.env`:**
```env
PORT=3001
TELEGRAM_BOT_TOKEN=<your-bot-token>
ALLOWED_ORIGINS=<tunnel-url>,http://localhost:8081
ADMIN_TELEGRAM_ID=<your-telegram-id>
```

**`server/src/config/whitelist.json`:**
```json
[<your-telegram-id>]
```

## 🛠️ Development

### Prerequisites

- Node.js 20+
- Yarn
- Cloudflared CLI

### Install Dependencies

```bash
# Root
yarn install

# Server
cd server && npm install
```

### Available Scripts

```bash
# Development
yarn start              # Expo dev client
yarn web                # Expo web dev

# Build & Deploy
yarn build:web          # Build web + inject Telegram SDK
yarn start:tunnel       # Start tunnel + update env
yarn start:full         # Complete deployment

# Server
cd server && npm run dev    # Development
cd server && npm start      # Production
```

## 📁 Project Structure

```
pi-manager/
├── app/                      # React Native frontend
│   ├── screens/              # Screen components
│   ├── services/             # Socket + Telegram services
│   └── navigators/           # Navigation
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── socket/           # Socket.IO modules
│   │   └── auth/             # Telegram auth
│   └── public/               # Built frontend
├── shared/                   # Shared types
├── scripts/                  # Automation scripts
│   ├── start-with-tunnel.sh  # Full deployment
│   ├── start-tunnel.sh       # Tunnel only
│   └── add-telegram-sdk.sh   # SDK injection
└── docs/                     # Documentation
```

## 🔧 Scripts Reference

### `yarn start:full`

Complete deployment automation:
- Builds web frontend
- Starts Cloudflare tunnel
- Updates `.env` files with tunnel URL
- Starts backend server
- Outputs tunnel URL and PIDs

### `yarn start:tunnel`

Tunnel-only startup:
- Kills existing tunnels
- Starts new Cloudflare tunnel
- Updates `.env` files
- Does NOT rebuild or restart servers

### `yarn build:web`

Build frontend:
- Exports web build to `dist/`
- Auto-injects Telegram WebApp SDK
- Copies to `server/public/`

## 🌐 Tunnel Management

### Quick Tunnel (Development)

```bash
cloudflared tunnel --url http://localhost:3001
```

URL changes on each restart. Update Telegram bot menu button.

### Named Tunnel (Production)

See [`docs/backend/appendix-d-cloudflare-tunnel.md`](./docs/backend/appendix-d-cloudflare-tunnel.md)

## 🔐 Security

### Environment Variables

- `.env` and `server/.env` are gitignored
- Never commit bot tokens or secrets
- Use environment variables in production

### Whitelist

Only Telegram user IDs in `server/src/config/whitelist.json` can access the app.

## 📚 Documentation

- [Backend docs](./docs/backend/README.md)
- [UI specs](./docs/ui/README.md)
- [Telegram setup](./TELEGRAM_SETUP.md)
- [Cloudflare tunnel](./docs/backend/appendix-d-cloudflare-tunnel.md)

## 🐛 Troubleshooting

### Tunnel fails to start
```bash
# Check if port 3001 is in use
lsof -ti:3001 | xargs kill -9

# Restart tunnel
yarn start:tunnel
```

### 502 Bad Gateway
```bash
# Check server status
cat /tmp/server.log

# Restart server
cd server && npm run dev
```

### Telegram auth fails
- Verify BOT_TOKEN in `server/.env`
- Check whitelist includes your Telegram ID
- Ensure tunnel URL matches bot menu button URL

## 📄 License

MIT
