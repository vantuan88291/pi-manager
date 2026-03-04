#!/bin/bash
# Complete startup script: tunnel first → update env → build → start server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
SERVER_ENV_FILE="$PROJECT_ROOT/server/.env"

echo "🚀 Pi Manager - Complete Startup Script"
echo "======================================="
echo ""

# Step 1: Kill existing processes
echo "🛑 Step 1/6: Stopping existing processes..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2
echo "✅ Processes stopped"
echo ""

# Step 2: Start Cloudflare tunnel FIRST to get URL
echo "🌐 Step 2/6: Starting Cloudflare Quick Tunnel..."
rm -f /tmp/tunnel.log
cloudflared tunnel --url http://localhost:3001 >> /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

# Wait for tunnel URL (max 30 seconds)
echo "   Waiting for tunnel URL..."
TUNNEL_URL=""
for i in {1..30}; do
  if [ -f /tmp/tunnel.log ] && grep -q "trycloudflare.com" /tmp/tunnel.log; then
    TUNNEL_URL=$(grep -o 'https://[^[:space:]"<>]*\.trycloudflare\.com' /tmp/tunnel.log | head -1 | tr -d '[:space:]')
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get tunnel URL. Check /tmp/tunnel.log"
  cat /tmp/tunnel.log
  exit 1
fi

echo "✅ Tunnel started: $TUNNEL_URL"
echo ""

# Step 3: Update environment files BEFORE build
echo "⚙️  Step 3/6: Updating environment files..."

# Update frontend .env FIRST
if [ -f "$ENV_FILE" ]; then
  sed -i "s|EXPO_PUBLIC_SOCKET_URL=.*|EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL" > "$ENV_FILE"
fi
echo "✅ Updated $ENV_FILE"

# Update backend .env
if [ -f "$SERVER_ENV_FILE" ]; then
  if grep -q "ALLOWED_ORIGINS=" "$SERVER_ENV_FILE"; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001|" "$SERVER_ENV_FILE"
  else
    echo "ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001" >> "$SERVER_ENV_FILE"
  fi
else
  cat > "$SERVER_ENV_FILE" << ENVEOF
PORT=3001
TELEGRAM_BOT_TOKEN=your-bot-token-here
ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001
ADMIN_TELEGRAM_ID=your-telegram-id
ENVEOF
fi
echo "✅ Updated $SERVER_ENV_FILE"
echo ""

# Step 4: Build web frontend WITH correct env (clear cache first!)
echo "📦 Step 4/6: Building web frontend (with tunnel URL)..."
cd "$PROJECT_ROOT"

# CRITICAL: Clear Expo cache to ensure env is reloaded
rm -rf .expo dist node_modules/.cache

# Build with clean environment
env -i PATH="$PATH" HOME="$HOME" USER="$USER" EXPO_PUBLIC_SOCKET_URL="$TUNNEL_URL" npx expo export --platform web

# Add Telegram SDK
./scripts/add-telegram-sdk.sh

# Copy to server/public
rm -rf server/public/*
cp -r dist/* server/public/

# Verify built URL
BUILT_URL=$(grep -o "https://[^\"']*trycloudflare\.com" dist/_expo/static/js/web/*.js 2>/dev/null | head -1 | cut -d: -f2-)
if [ "$BUILT_URL" != "$TUNNEL_URL" ]; then
  echo "⚠️  Warning: Built URL ($BUILT_URL) may differ from tunnel URL"
else
  echo "✅ Build verified: Socket URL matches tunnel URL"
fi

echo "✅ Build complete"
echo ""

# Step 5: Start backend server
echo "🖥️  Step 5/6: Starting backend server..."
cd "$PROJECT_ROOT/server"
npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Server started"
else
  echo "❌ Server failed to start. Check /tmp/server.log"
  exit 1
fi
echo ""

# Step 6: Verify everything
echo "🔍 Step 6/6: Verifying setup..."
sleep 2
if curl -s "$TUNNEL_URL/api/health" > /dev/null 2>&1; then
  echo "✅ Backend accessible via tunnel"
else
  echo "⚠️  Backend not yet accessible (may take a few seconds)"
fi
echo ""

# Summary
echo "======================================="
echo "🎉 Pi Manager started successfully!"
echo ""
echo "📊 Summary:"
echo "   Tunnel URL: $TUNNEL_URL"
echo "   Server PID: $SERVER_PID"
echo "   Tunnel PID: $TUNNEL_PID"
echo ""
echo "🔗 Quick Links:"
echo "   - Frontend: $TUNNEL_URL"
echo "   - Backend:  $TUNNEL_URL/api/health"
echo "   - Server log: /tmp/server.log"
echo "   - Tunnel log: /tmp/tunnel.log"
echo ""
echo "🛑 To stop:"
echo "   kill $SERVER_PID $TUNNEL_PID"
echo "   or: pkill -f 'npm run dev' && pkill -f 'cloudflared tunnel'"
echo ""
echo "📝 Note: Update Telegram Bot menu button with new URL:"
echo "   @BotFather → /setmenubutton → $TUNNEL_URL"
echo "======================================="

# Keep script running to maintain tunnel
wait $SERVER_PID
