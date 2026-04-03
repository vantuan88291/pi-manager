/**
 * REST base URL aligned with Socket.IO (see SocketManager.getSocketUrl).
 * Relative "/api/..." only works when the web app is served from the Node server.
 */
export function getRestApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL?.trim()
  if (fromEnv && fromEnv !== "__TUNNEL_URL__") {
    return fromEnv.replace(/\/$/, "")
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "")
  }
  return "http://localhost:3001"
}

export function restApiUrl(path: string): string {
  const base = getRestApiBaseUrl()
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

type ApiJsonBody = Record<string, unknown>

export async function postJsonApi<T extends ApiJsonBody = ApiJsonBody>(
  path: string,
  body: ApiJsonBody,
): Promise<T> {
  const res = await fetch(restApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    throw new Error(
      "Server did not return JSON — set EXPO_PUBLIC_SOCKET_URL to your Pi server (e.g. http://localhost:3001).",
    )
  }

  const data = (await res.json()) as T & { success?: boolean; error?: string }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || res.statusText || `HTTP ${res.status}`)
  }

  return data as T
}

export async function getJsonApi<T extends ApiJsonBody = ApiJsonBody>(path: string): Promise<T> {
  const res = await fetch(restApiUrl(path))

  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    throw new Error(
      "Server did not return JSON — set EXPO_PUBLIC_SOCKET_URL to your Pi server (e.g. http://localhost:3001).",
    )
  }

  const data = (await res.json()) as T & { success?: boolean; error?: string }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || res.statusText || `HTTP ${res.status}`)
  }

  return data as T
}

/** POST multipart (do not set Content-Type — browser sets boundary). */
export async function postMultipartApi<T extends ApiJsonBody = ApiJsonBody>(
  apiPath: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(restApiUrl(apiPath), {
    method: "POST",
    body: formData,
  })

  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    throw new Error(
      "Server did not return JSON — set EXPO_PUBLIC_SOCKET_URL to your Pi server (e.g. http://localhost:3001).",
    )
  }

  const data = (await res.json()) as T & { success?: boolean; error?: string }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || res.statusText || `HTTP ${res.status}`)
  }

  return data as T
}
