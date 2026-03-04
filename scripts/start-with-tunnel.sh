#!/bin/bash
# Complete startup script: tunnel → update env → build → inject URL → start server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
SERVER_ENV_FILE="$PROJECT_ROOT/server/.env"

echo "🚀 Pi Manager - Complete Startup Script"
echo "======================================="
echo ""

# Step 1: Kill existing processes
echo "🛑 Step 1/7: Stopping existing processes..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2
echo "✅ Processes stopped"
echo ""

# Step 2: Start Cloudflare tunnel
echo "🌐 Step 2/7: Starting Cloudflare Quick Tunnel..."
rm -f /tmp/tunnel.log
cloudflared tunnel --url http://localhost:3001 >> /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

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

# Step 3: Update environment files
echo "⚙️  Step 3/7: Updating environment files..."

if [ -f "$ENV_FILE" ]; then
  sed -i "s|EXPO_PUBLIC_SOCKET_URL=.*|EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_SOCKET_URL=$TUNNEL_URL" > "$ENV_FILE"
fi
echo "✅ Updated $ENV_FILE"

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

# Step 4: Build web frontend
echo "📦 Step 4/7: Building web frontend..."
cd "$PROJECT_ROOT"
rm -rf .expo dist
npx expo export --platform web
echo "✅ Build complete"
echo ""

# Step 5: Add SDK and inject URL
echo "💉 Step 5/7: Injecting tunnel URL into build..."

sed -i 's|<title>Pi Manager</title>|<title>Pi Manager</title>\n    <script src="https://telegram.org/js/telegram-web-app.js"></script>|' dist/index.html

rm -rf server/public/*
cp -r dist/* server/public/

# Inject URL into JS bundle
find server/public/_expo/static/js/web/ -name "*.js" -type f -exec sed -i "s|https://[a-zA-Z0-9._-]*trycloudflare\.com|$TUNNEL_URL|g" {} \;

BUILT_URL=$(grep -o "https://[a-zA-Z0-9._-]*trycloudflare\.com" server/public/_expo/static/js/web/*.js 2>/dev/null | head -1)
if [ "$BUILT_URL" = "$TUNNEL_URL" ]; then
  echo "✅ URL injected: $BUILT_URL"
else
  echo "❌ URL mismatch. Expected: $TUNNEL_URL, Got: $BUILT_URL"
  exit 1
fi
echo ""

# Step 6: Start backend server
echo "🖥️  Step 6/7: Starting backend server..."
cd "$PROJECT_ROOT/server"
npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Server started"
else
  echo "❌ Server failed to start"
  exit 1
fi
echo ""

# Step 7: Verify
echo "🔍 Step 7/7: Verifying setup..."
sleep 2
if curl -s "$TUNNEL_URL/api/health" > /dev/null 2>&1; then
  echo "✅ Backend accessible"
else
  echo "⚠️  Backend not yet accessible"
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
echo ""
echo "📝 Update Telegram Bot:"
echo "   @BotFather → /setmenubutton → $TUNNEL_URL"
echo "======================================="

wait $SERVER_PID
