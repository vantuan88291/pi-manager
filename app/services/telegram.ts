/**
 * Telegram WebApp helpers for Mini App integration
 */

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

interface TelegramWebApp {
  initData: string // URL-encoded query string
  initDataUnsafe: {
    user?: TelegramUser
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
    offClick(cb: () => void): void
  }
  BackButton: {
    show(): void
    hide(): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
    header_bg_color?: string
  }
  colorScheme: "light" | "dark"
  platform: "android" | "ios" | "web" | "unknown"
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
  const tg = getTelegramWebApp()
  return tg?.initData || null
}

export function isTelegramMiniApp(): boolean {
  // Check if running inside Telegram Mini App
  const tg = getTelegramWebApp()
  return !!tg && !!tg.initData
}

export function isWebBrowser(): boolean {
  // Check if running in web browser (not Telegram Mini App)
  return !isTelegramMiniApp()
}

export function getTelegramUser(): TelegramUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null
}

// Debug helper - returns full Telegram state
export function getTelegramDebugInfo(): {
  hasWindowTelegram: boolean
  hasWebApp: boolean
  hasInitData: boolean
  initDataPreview: string
  platform: string
  colorScheme: string
} {
  const tg = window.Telegram?.WebApp
  
  return {
    hasWindowTelegram: !!window.Telegram,
    hasWebApp: !!tg,
    hasInitData: !!tg?.initData,
    initDataPreview: tg?.initData ? tg.initData.substring(0, 50) + "..." : "",
    platform: tg?.platform || "unknown",
    colorScheme: tg?.colorScheme || "unknown",
  }
}
