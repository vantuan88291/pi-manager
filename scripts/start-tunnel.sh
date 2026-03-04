#!/bin/bash
# Start Cloudflare tunnel and update env files (without rebuild)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
SERVER_ENV_FILE="$PROJECT_ROOT/server/.env"

echo "🌐 Pi Manager - Tunnel Startup Script"
echo "====================================="
echo ""

# Kill existing tunnel
echo "🛑 Stopping existing tunnels..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2
echo "✅ Tunnels stopped"
echo ""

# Start new tunnel
echo "🌐 Starting Cloudflare Quick Tunnel..."
cloudflared tunnel --url http://localhost:3001 > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

# Wait for tunnel URL
echo "   Waiting for tunnel URL..."
for i in {1..15}; do
  if grep -q "trycloudflare.com" /tmp/tunnel.log; then
    break
  fi
  sleep 1
done

# Extract tunnel URL
TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get tunnel URL. Check /tmp/tunnel.log"
  exit 1
fi

echo "✅ Tunnel started: $TUNNEL_URL"
echo ""

# Update environment files
echo "⚙️  Updating environment files..."

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
  if grep -q "ALLOWED_ORIGINS=" "$SERVER_ENV_FILE"; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001|" "$SERVER_ENV_FILE"
  else
    echo "ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:8081,http://localhost:3001" >> "$SERVER_ENV_FILE"
  fi
  echo "✅ Updated $SERVER_ENV_FILE"
fi
echo ""

# Summary
echo "====================================="
echo "🎉 Tunnel started successfully!"
echo ""
echo "📊 Summary:"
echo "   Tunnel URL: $TUNNEL_URL"
echo "   Tunnel PID: $TUNNEL_PID"
echo ""
echo "🔗 Quick Links:"
echo "   - Frontend: $TUNNEL_URL"
echo "   - Backend:  $TUNNEL_URL/api/health"
echo "   - Tunnel log: /tmp/tunnel.log"
echo ""
echo "🛑 To stop:"
echo "   kill $TUNNEL_PID"
echo "   or: pkill -f 'cloudflared tunnel'"
echo ""
echo "📝 Note: Update Telegram Bot menu button with new URL:"
echo "   @BotFather → /setmenubutton → $TUNNEL_URL"
echo "====================================="
