# Pi Manager — Overview & Architecture

> Part of Pi Manager spec. See also:
> - [backend/README.md](./backend/README.md) — backend + socket spec (split docs)
> - [ui/README.md](./ui/README.md) — UI spec (split docs)

---

## 1. Overview

**Pi Manager** is a mobile-first dashboard for remotely managing a Raspberry Pi device.
It provides real-time monitoring (CPU, RAM, disk, SSD health), peripheral control (Wi-Fi, Bluetooth, audio),
and camera streaming (WebRTC) — all through a React Native Web app embedded inside a Telegram Mini App.

### Deployment Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Raspberry Pi (single device)                          │
│                                                                                  │
│  ┌──────────────────────────────────────────┐                                    │
│  │     Node.js Server (Express + Socket.IO) │──► OS / GPIO APIs                  │
│  │     port 3001                            │    (nmcli, amixer, bluetoothctl,    │
│  │                                          │     libcamera, etc.)               │
│  │     • Serves static frontend build       │                                    │
│  │     • Socket.IO WebSocket endpoint       │                                    │
│  │     • WebRTC signaling                   │                                    │
│  └──────────────┬───────────────────────────┘                                    │
│                 │                                                                 │
└─────────────────┼─────────────────────────────────────────────────────────────────┘
                  │
                  │  cloudflared tunnel (HTTPS)
                  ▼
         ┌─────────────────┐
         │  Telegram Bot    │  ← WebApp embed (Mini App iframe)
         │  end-user opens  │     URL: https://pi.example.com
         └─────────────────┘
```

**In production, there is a single server process.** The Express server serves both the static
frontend build (React Native Web) and the Socket.IO WebSocket endpoint on the same port.
No separate Expo dev server. Cloudflare Tunnel exposes this single port to the internet.

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React Native Web, Expo SDK 54, React 19, TypeScript | UI, runs in browser |
| Backend | Node.js, Express, Socket.IO | Runs on the Pi, talks to hardware |
| Tunnel | Cloudflare Tunnel (`cloudflared`) | Exposes local to internet via HTTPS |
| Client | Telegram Bot API + Mini App SDK | Entry point for users |
| Camera | WebRTC (signaling over Socket.IO) | P2P video stream from Pi camera |

### Core Principles

- **Real-time first** — all data flows over WebSocket. REST only for file upload / initial health check.
- **One Pi, one server** — backend runs directly on the Pi it manages. No multi-device orchestration (v1).
- **Mobile-first** — optimized for Telegram Mini App viewport (375–430 px). Must look great on small screens.
- **Modular sockets** — every feature is a self-contained socket module. Adding a new feature = adding a new module on both client and server. No monolithic event handlers.
- **Offline-tolerant** — graceful disconnect/reconnect with visual feedback.
- **Whitelist-gated** — only Telegram user IDs present in a configurable whitelist can access the app. All others are rejected at the socket auth layer.

---

## 2. Project Structure (monorepo)

> **Target structure.** `server/` and `shared/` are created in Phase 1; until then they are not present in the repo. `app/` exists (Ignite scaffold).

```
pi-manager/
├── app/                            # React Native frontend (Expo) — exists
│   ├── app.tsx                     # Root component, provider tree
│   ├── components/                 # Reusable UI components
│   ├── config/                     # Environment configs
│   ├── navigators/                 # React Navigation stacks & tabs
│   ├── screens/                    # Screen components
│   ├── services/api/               # REST client (fallback only)
│   ├── services/socket/            # (Phase 1) Socket.IO client, module registry
│   ├── theme/                      # Design tokens (colors, spacing, typography)
│   └── utils/                      # Storage (MMKV), helpers
│
├── server/                         # (Phase 1) Node.js backend (runs on Pi) — not yet in repo
│   ├── src/
│   │   ├── index.ts                # Entry: Express + Socket.IO bootstrap
│   │   ├── socket/                 # Socket.IO server, module loader
│   │   ├── auth/                   # Telegram initData, whitelist
│   │   └── config/whitelist.json   # Allowed Telegram user IDs (file/config only, no UI)
│   └── ...
│
├── shared/                         # (Phase 1) Shared TypeScript types & constants — not yet in repo
│   ├── types/                      # socket-events, system, wifi, bluetooth, audio, camera, storage, telegram
│   └── constants/events.ts        # Event name literals
│
├── docs/
│   ├── OVERVIEW.md                 # This file — architecture, structure, roadmap summary
│   └── backend/README.md           # Backend + socket spec (index; split docs)
│   └── ui/README.md                # UI spec (index; split docs)
└── package.json                   # Root workspace config
```

**Where to find more:** Data types, tech stack tables, commands, environment variables, and Quick Start are in [backend/README.md](./backend/README.md). Screen layouts, component library, and navigation are in [ui/README.md](./ui/README.md).

---

## 10. Provider Hierarchy (app.tsx)

```
SafeAreaProvider
  └─ KeyboardProvider
      └─ ThemeProvider
          └─ SocketProvider          # manages socket connection
              └─ AuthProvider         # manages Telegram auth state
                  └─ AppNavigator
```

---

## 11. Current State (as-is)

- Scaffolded with Ignite CLI (Infinite Red boilerplate). **No `server/` or `shared/` yet** — to be created in Phase 1.
- **Navigation:** App stack currently has `Welcome`, `Login` only. UI spec (TelegramAuthScreen, MainTabs with Dashboard/Control/Settings) is **planned** — see `docs/ui/README.md`.
- `WelcomeScreen` exists and will be reused as the main Dashboard (rename + rewrite in Phase 1).
- Theme system: light/dark, Space Grotesk, spacing tokens, `themed()` helper. No Socket.IO or Telegram integration yet.
- Full task breakdown: see `docs/backend/README.md` (server/socket) and `docs/ui/README.md` (screens/components).

---

## 12. Development Roadmap (summary)

| Phase | Focus |
|-------|--------|
| **Phase 0** | Theme foundation — redesign `colors.ts` / `colorsDark.ts`, semantic tokens, feature accent map. Do first so all UI uses a consistent palette. |
| **Phase 1** | Foundation — server + shared types, auth (initData → session token), whitelist, SocketManager + modules, DashboardScreen, BottomTab nav. |
| **Phase 2** | Core peripherals — Wi-Fi, Bluetooth, Audio, Storage (nvme-cli), ControlMenuScreen, SettingsScreen. |
| **Phase 3** | Camera & WebRTC — signaling, CameraScreen, resolution selector. |
| **Phase 4** | Telegram — Bot + Mini App, auth flow, Cloudflare Tunnel guide. |
| **Phase 5** | Safety & production — ack/timeout, rate limits, validation, production build (static + Express), cloudflared + systemd, E2E/CI. |

Detailed checklists and copy-paste snippets (e.g. theme palette) are in `docs/backend/README.md` and `docs/ui/README.md`.

---

*Last updated: 2026-02-21*
