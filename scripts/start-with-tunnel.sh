#!/bin/bash
# Complete startup script: build → tunnel → update env → start servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
SERVER_ENV_FILE="$PROJECT_ROOT/server/.env"

echo "🚀 Pi Manager - Complete Startup Script"
echo "======================================="
echo ""

# Step 1: Build web frontend
echo "📦 Step 1/5: Building web frontend..."
cd "$PROJECT_ROOT"
yarn build:web
echo "✅ Build complete"
echo ""

# Step 2: Kill existing tunnel (if any)
echo "🛑 Step 2/5: Stopping existing tunnels..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2
echo "✅ Tunnels stopped"
echo ""

# Step 3: Start new Cloudflare tunnel
echo "🌐 Step 3/5: Starting Cloudflare Quick Tunnel..."
cloudflared tunnel --url http://localhost:3001 > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

# Wait for tunnel to be ready (max 15 seconds)
echo "   Waiting for tunnel URL..."
for i in {1..15}; do
  if grep -q "trycloudflare.com" /tmp/tunnel.log; then
    break
  fi
  sleep 1
done

# Extract tunnel URL (handle both formats)
TUNNEL_URL=$(grep -o 'https://[^[:space:]"<>]*\.trycloudflare\.com' /tmp/tunnel.log | head -1 | tr -d '[:space:]')

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get tunnel URL. Check /tmp/tunnel.log"
  cat /tmp/tunnel.log
  exit 1
fi

echo "✅ Tunnel started: $TUNNEL_URL"
echo ""

# Step 4: Update environment files
echo "⚙️  Step 4/5: Updating environment files..."

# Update frontend .env
if [ -f "$ENV_FILE" ]; then
  sed -i "s|EXPO_PUBLIC_SOCKET_URL=.*|EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL|" "$ENV_FILE"
  echo "✅ Updated $ENV_FILE"
else
  echo "EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL" > "$ENV_FILE"
  echo "✅ Created $ENV_FILE"
fi

# Update backend .env (ALLOWED_ORIGINS)
if [ -f "$SERVER_ENV_FILE" ]; then
  # Update ALLOWED_ORIGINS to include tunnel URL
  if grep -q "ALLOWED_ORIGINS=" "$SERVER_ENV_FILE"; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001|" "$SERVER_ENV_FILE"
  else
    echo "ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001" >> "$SERVER_ENV_FILE"
  fi
  echo "✅ Updated $SERVER_ENV_FILE"
else
  cat > "$SERVER_ENV_FILE" << ENVEOF
PORT=3001
TELEGRAM_BOT_TOKEN=your-bot-token-here
ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001
ADMIN_TELEGRAM_ID=your-telegram-id
ENVEOF
  echo "✅ Created $SERVER_ENV_FILE"
fi
echo ""

# Step 5: Start backend server
echo "🖥️  Step 5/5: Starting backend server..."
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
