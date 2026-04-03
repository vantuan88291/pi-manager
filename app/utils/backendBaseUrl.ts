/**
 * Single origin for Socket.IO and REST `/api/*` (same Node server).
 *
 * - When EXPO_PUBLIC_SOCKET_URL is set (and not the __TUNNEL_URL__ build placeholder), use it.
 * - On web served from the API host (e.g. Telegram Mini App on trycloudflare.com), same-origin works.
 * - Expo web dev serves the bundle from Metro (~:8081); the API is on :3001 — never use page origin there.
 */
export function getBackendBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL?.trim()
  if (fromEnv && fromEnv !== "__TUNNEL_URL__") {
    return fromEnv.replace(/\/$/, "")
  }

  if (typeof globalThis !== "undefined" && "location" in globalThis) {
    const loc = (globalThis as unknown as Window).location
    if (loc?.origin) {
      const origin = loc.origin.replace(/\/$/, "")
      const host = loc.hostname
      const port = loc.port
      const isExpoMetroWeb =
        (host === "localhost" || host === "127.0.0.1") && port === "8081"

      if (isExpoMetroWeb) {
        return "http://localhost:3001"
      }
      return origin
    }
  }

  return "http://localhost:3001"
}
