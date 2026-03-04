#!/bin/bash
# Add Telegram WebApp SDK to built index.html

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Support two locations: dist/ (after build) or server/public/ (after deploy)
INDEX_HTML="$PROJECT_ROOT/dist/index.html"
if [ ! -f "$INDEX_HTML" ]; then
  INDEX_HTML="$PROJECT_ROOT/server/public/index.html"
fi

if [ ! -f "$INDEX_HTML" ]; then
  echo "❌ index.html not found"
  exit 1
fi

if ! grep -q "telegram-web-app.js" "$INDEX_HTML"; then
  sed -i 's|<title>Pi Manager</title>|<title>Pi Manager</title>\n    <!-- Telegram WebApp SDK -->\n    <script src="https://telegram.org/js/telegram-web-app.js"></script>|' "$INDEX_HTML"
  echo "✅ Added Telegram SDK to $INDEX_HTML"
else
  echo "✅ Telegram SDK already present in $INDEX_HTML"
fi
