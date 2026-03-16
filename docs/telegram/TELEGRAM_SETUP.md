# Telegram Mini App Setup Guide

## ✅ Setup Checklist

- [ ] Bot Token: Get from @BotFather
- [ ] Whitelist: Add your Telegram ID to `server/src/config/whitelist.json`
- [ ] TelegramAuthScreen: ✅ Created
- [ ] Socket wiring: ✅ Integrated with Telegram initData
- [ ] Translations: ✅ Added vi/en

---

## 🚀 Quick Start

### Bước 1: Tạo Telegram Bot

1. Mở Telegram, search `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên bot (ví dụ: `Pi Manager Bot`)
4. Đặt username cho bot (phải kết thúc bằng `bot`, ví dụ: `pi_manager_dev_bot`)
5. **Lưu lại BOT_TOKEN** (dạng `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Bước 2: Cấu hình Bot

1. Gửi `/setmenubutton` cho @BotFather
2. Chọn bot của bạn
3. Gửi URL: `https://<your-tunnel-url>.trycloudflare.com`
4. Đặt text: `Open Pi Manager`

### Bước 3: Lấy Telegram User ID

1. Search `@userinfobot` trên Telegram
2. Gửi `/start`
3. Nó sẽ trả về ID của bạn (ví dụ: `600843385`)
4. **Lưu lại ID này** để add vào whitelist

---

## 🔧 Config Files

### 1. Update `server/.env`

```env
PORT=3001
TELEGRAM_BOT_TOKEN=<your-bot-token-here>
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3001
ADMIN_TELEGRAM_ID=<your-telegram-id>
```

### 2. Update `server/src/config/whitelist.json`

```json
[<your-telegram-id>, <other-allowed-ids>]
```

Example:
```json
[600843385, 7441186402]
```

---

## 🏃 Run & Test

### Terminal 1: Start server
```bash
cd ~/Documents/code/reactnative/pi-manager/server
npm run dev
```

### Terminal 2: Cloudflare Quick Tunnel
```bash
cloudflared tunnel --url http://localhost:3001
```

**Lưu lại URL** từ output (dạng: `https://random-subdomain.trycloudflare.com`)

### Terminal 3: Build + Start frontend
```bash
cd ~/Documents/code/reactnative/pi-manager
yarn build:web
cd server && npm run dev
```

### Test trong Telegram

1. Mở bot của bạn trên Telegram
2. Nhấn menu button "Open Pi Manager"
3. Ứng dụng sẽ mở trong Telegram Mini App
4. Tự động auth với Telegram initData
5. Nếu thành công → vào Dashboard

---

## 🐛 Debug

### Lỗi thường gặp:

**"NOT_IN_TELEGRAM"**
- Mở app trong Telegram, không mở browser

**"ACCESS_DENIED"**
- Kiểm tra whitelist.json có Telegram ID của bạn không

**"AUTH_INVALID"**
- Kiểm tra BOT_TOKEN trong server/.env
- Bot token có thể hết hạn, tạo lại bot mới

**Tunnel không kết nối được:**
- Kiểm tra server đang chạy trên port 3001
- Restart cloudflared tunnel

**502 Bad Gateway:**
- Server bị crash → check `/tmp/server.log`
- Restart server: `cd server && npm run dev`

---

## 📝 Next Steps

Sau khi test thành công:

1. **Setup tunnel cố định** (config file + systemd)
2. **Mua domain** (optional, để URL đẹp hơn)
3. **Production build** frontend
4. **Setup systemd** cho server + tunnel

---

## 🔗 Tài liệu liên quan

- [docs/backend/appendix-c-telegram-mini-app-integration.md](../backend/appendix-c-telegram-mini-app-integration.md)
- [docs/backend/appendix-d-cloudflare-tunnel.md](../backend/appendix-d-cloudflare-tunnel.md)
