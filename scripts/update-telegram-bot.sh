#!/bin/bash

# Telegram Bot Token (passed as argument)
BOT_TOKEN="$1"
URL="$2"

if [ -z "$BOT_TOKEN" ] || [ -z "$URL" ]; then
  echo "Usage: $0 <bot_token> <url>"
  exit 1
fi

echo "🔄 Updating Telegram bot menu to: $URL"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": 0,
    \"menu_button\": {
      \"type\": \"web_app\",
      \"text\": \"Open Pi Manager\",
      \"web_app\": {
        \"url\": \"${URL}\"
      }
    }
  }")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Bot menu updated successfully!"
else
  echo "❌ Failed to update bot menu"
  echo "Response: $RESPONSE"
  exit 1
fi
