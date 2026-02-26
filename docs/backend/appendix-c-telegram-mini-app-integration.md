# Appendix C: Telegram Mini App Integration (detailed)

> Split backend docs (Appendix C).

## C.1 Getting initData on the frontend

Telegram injects a global `window.Telegram.WebApp` object into the Mini App iframe.
The `initData` string is available immediately.

```typescript
// app/services/telegram.ts

interface TelegramWebApp {
  initData: string // URL-encoded query string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
      language_code?: string
    }
    auth_date: number
    hash: string
  }
  ready(): void // tell Telegram the app is ready
  expand(): void // expand to full height
  close(): void // close the Mini App
  MainButton: {
    text: string
    show(): void
    hide(): void
    onClick(cb: () => void): void
  }
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function getInitData(): string | null {
  return getTelegramWebApp()?.initData || null
}

export function isTelegramMiniApp(): boolean {
  return !!getInitData()
}
```

## C.2 TelegramAuthScreen (frontend)

This screen is the first screen shown. It reads initData, connects the socket,
and waits for `auth:success` before navigating to the main app.

```typescript
// app/screens/TelegramAuthScreen.tsx — logic outline

export const TelegramAuthScreen: FC = function TelegramAuthScreen() {
  const { themed } = useAppTheme()
  const { socketManager } = useSocket()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [errorCode, setErrorCode] = useState("")

  useEffect(() => {
    const tg = getTelegramWebApp()
    if (tg) {
      tg.ready() // tell Telegram the WebApp is ready
      tg.expand() // expand to full screen height
    }

    const initData = getInitData()

    if (!initData) {
      // Not running inside Telegram — dev mode fallback
      if (__DEV__) {
        // In dev, use a mock initData or skip auth
        socketManager.connectDev()
        return
      }
      setStatus("error")
      setErrorCode("NOT_IN_TELEGRAM")
      return
    }

    socketManager.connect(initData)

    // auth:success is handled by SocketProvider → navigates to MainTabs
    // connect_error is handled here:
    socketManager.onConnectError((err) => {
      setStatus("error")
      setErrorCode(err.message) // "AUTH_INVALID" | "ACCESS_DENIED" | etc.
    })
  }, [])

  if (status === "error" && errorCode === "ACCESS_DENIED") {
    // navigate to AccessDeniedScreen
  }

  // Show loading spinner while auth is in progress
  return (/* loading UI */)
}
```

## C.3 Dev mode: bypassing Telegram auth locally

When running on `localhost:8081` outside of Telegram, `window.Telegram` does not exist.
For development, the server accepts a special dev-only auth path:

```typescript
// server/src/socket/index.ts — in the auth middleware, before Path B:

// DEV ONLY: allow connection without Telegram initData
if (process.env.NODE_ENV !== "production" && !initData && !sessionToken) {
  const devUser = { id: 0, firstName: "Developer" }
  socket.data.user = devUser
  socket.data.sessionToken = crypto.randomUUID()
  sessions.set(socket.data.sessionToken, { user: devUser, createdAt: Date.now() })
  return next()
}
```

This block is skipped in production. In dev, you can connect without Telegram.

## C.4 Server-side validate (already in Appendix A.6)

See `server/src/auth/telegram.ts` in Appendix A.6 for the complete HMAC validation function.

Key points:
- **Input:** raw `initData` string (URL-encoded query params from Telegram)
- **Process:** Sort params alphabetically, compute HMAC-SHA256, compare with `hash` param
- **Freshness:** Reject if `auth_date` is > 1 hour old
- **Output:** `TelegramUser` object or `null`

## C.5 Telegram Bot setup (@BotFather)

```
1. Open @BotFather on Telegram
2. /newbot → give it a name → get BOT_TOKEN
3. /setmenubutton → set the Mini App URL:
   URL: https://pi.example.com (your Cloudflare Tunnel URL)
   Button text: "Open Pi Manager"
4. /setwebapp (or via Bot API) → same URL
5. Save BOT_TOKEN to server/.env
```

