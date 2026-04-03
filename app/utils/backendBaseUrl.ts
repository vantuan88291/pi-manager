/**
 * Single origin for Socket.IO and REST `/api/*` (same Node server).
 *
 * **Web (production / tunnel / Telegram Mini App):** prefer `window.location.origin` so the
 * backend URL tracks the URL the user actually opened. Baked `EXPO_PUBLIC_SOCKET_URL` can stay
 * stale after `yarn start:full` updates `.env` until a full rebuild — same-origin avoids that.
 *
 * **Expo web dev (`localhost:8081`):** Metro is not the API host — use env or `http://localhost:3001`.
 *
 * **Native:** no `window` — use `EXPO_PUBLIC_SOCKET_URL` or localhost default.
 */
function isExpoMetroWebDev(loc: Location): boolean {
  const host = loc.hostname
  const port = loc.port
  return (host === "localhost" || host === "127.0.0.1") && port === "8081"
}

function backendUrlFromEnv(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL?.trim()
  if (fromEnv && fromEnv !== "__TUNNEL_URL__") {
    return fromEnv.replace(/\/$/, "")
  }
  return null
}

export function getBackendBaseUrl(): string {
  const envUrl = backendUrlFromEnv()

  if (typeof globalThis !== "undefined" && "location" in globalThis) {
    const loc = (globalThis as unknown as Window).location
    if (loc?.origin) {
      const origin = loc.origin.replace(/\/$/, "")

      if (isExpoMetroWebDev(loc)) {
        return envUrl ?? "http://localhost:3001"
      }

      // Same host as the HTML bundle (tunnel, local server on :3001, etc.)
      return origin
    }
  }

  return envUrl ?? "http://localhost:3001"
}
