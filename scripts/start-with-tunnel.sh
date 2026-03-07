#!/bin/bash
# Complete startup script for Pi Manager
# Uses runtime URL detection (window.location.origin) - no URL injection needed

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
echo "✅ Stopped"
echo ""

# Step 2: Start Cloudflare Tunnel
echo "🌐 Step 2/6: Starting Cloudflare Tunnel..."
rm -f /tmp/tunnel.log
cloudflared tunnel --url http://localhost:3001 >> /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for i in {1..30}; do
  if grep -q "trycloudflare.com" /tmp/tunnel.log 2>/dev/null; then
    TUNNEL_URL=$(grep -o 'https://[^[:space:]"<>]*\.trycloudflare\.com' /tmp/tunnel.log | head -1 | tr -d '[:space:]')
    [ -n "$TUNNEL_URL" ] && break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get tunnel URL"
  exit 1
fi
echo "✅ Tunnel: $TUNNEL_URL"
echo ""

# Step 3: Update .env files (URL not baked into build - uses runtime detection)
echo "⚙️  Step 3/6: Updating .env files..."
echo "# Socket URL detected at runtime via window.location.origin" > "$ENV_FILE"
cat > "$SERVER_ENV_FILE" << ENVEOF
PORT=3001
# TELEGRAM_BOT_TOKEN=your-bot-token-here
ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001
# ADMIN_TELEGRAM_ID=your-telegram-id
ENVEOF
echo "✅ Updated (runtime URL detection enabled)"
echo ""

# Step 4: Build frontend (clear cache to ensure fresh build)
echo "📦 Step 4/6: Building frontend..."
cd "$PROJECT_ROOT"
rm -rf .expo dist node_modules/.cache
npx expo export --platform web
echo "✅ Build done"
echo ""

# Step 5: Add Telegram SDK + copy to server
echo "💉 Step 5/6: Preparing deployment..."

# Add Telegram WebApp SDK
sed -i 's|<title>Pi Manager</title>|<title>Pi Manager</title>\n    <script src="https://telegram.org/js/telegram-web-app.js"></script>|' dist/index.html

# Copy to server/public
rm -rf server/public/*
cp -r dist/* server/public/

echo "✅ Deployment ready"
echo ""

# Step 6: Start server
echo "🖥️  Step 6/6: Starting server..."
cd "$PROJECT_ROOT/server"
npm run dev > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 3
[ -z "$(ps -p $SERVER_PID -o pid=)" ] && echo "❌ Server failed" && exit 1
echo "✅ Server: $SERVER_PID"
echo ""

# Verify backend is accessible
echo "🔍 Verifying..."
sleep 2
curl -s "$TUNNEL_URL/api/health" > /dev/null 2>&1 && echo "✅ Backend accessible" || echo "⚠️  Not ready yet"
echo ""

# Summary
echo "======================================="
echo "🎉 Pi Manager started successfully!"
echo ""
echo "📊 Summary:"
echo "   URL: $TUNNEL_URL"
echo "   Server PID: $SERVER_PID"
echo "   Tunnel PID: $TUNNEL_PID"
echo ""
echo "🔗 Links:"
echo "   Frontend: $TUNNEL_URL"
echo "   Backend: $TUNNEL_URL/api/health"
echo ""
echo "🛑 Stop: kill $SERVER_PID $TUNNEL_PID"
echo ""
echo "📝 Bot setup:"
echo "   @BotFather → /setmenubutton → $TUNNEL_URL"
echo "======================================="
echo ""
echo "💡 Note: Socket URL is detected at runtime (no hardcoded URLs)"

wait $SERVER_PID
