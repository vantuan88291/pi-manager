# Tech Stack & Provider Hierarchy

> Split backend docs (Tech stack + providers).

## 9. Tech Stack

### Frontend (app/)

| Package | Purpose |
|---------|---------|
| expo ~54 | Build toolchain |
| react-native 0.81.5 + react-native-web | Cross-platform UI |
| react 19 | Core |
| @react-navigation/native v7 | Navigation (stack + bottom tabs) |
| react-native-mmkv | Local storage |
| i18next + react-i18next | Internationalization |
| apisauce | REST fallback |
| socket.io-client | **(to install)** WebSocket client |
| react-native-reanimated | Animations, skeleton loaders, value transitions |
| react-native-svg | **(to install)** Icons, progress rings |

### Backend (server/)

| Package | Purpose |
|---------|---------|
| express | Minimal HTTP (health check, file upload) |
| socket.io | WebSocket server |
| systeminformation | Hardware stats |
| child_process (nmcli) | Wi-Fi management (nmcli only; no node-wifi) |
| child_process (bluetoothctl) | Bluetooth management |
| child_process (amixer/pactl) | Audio control |
| werift | WebRTC for camera (pure JS; wrtc has native deps, avoid on ARM64) |
| dotenv | Environment variables |
| zod | Runtime type validation |

### Infrastructure

| Tool | Purpose |
|------|---------|
| cloudflared | HTTPS tunnel |
| Telegram Bot API | Bot + Mini App |
| systemd | Auto-start on boot + process management (no pm2; use systemd only) |

---

## 10. Provider Hierarchy (app.tsx)

```
SafeAreaProvider
  └─ KeyboardProvider
      └─ ThemeProvider
          └─ SocketProvider          ← (new) manages socket connection
              └─ AuthProvider         ← (new) manages Telegram auth state
                  └─ AppNavigator
```

