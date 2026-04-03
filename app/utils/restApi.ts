import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

/**
 * REST base URL — same origin as Socket.IO (see getBackendBaseUrl).
 * Relative "/api/..." only works when the app is served from the Node server.
 */
export function getRestApiBaseUrl(): string {
  return getBackendBaseUrl()
}

export function restApiUrl(path: string): string {
  const base = getRestApiBaseUrl()
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

type ApiJsonBody = Record<string, unknown>

const BODY_PREVIEW_MAX = 900

function truncateBody(s: string, max = BODY_PREVIEW_MAX): string {
  const t = s.replace(/\s+/g, " ").trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export type RestApiErrorPhase = "network" | "http" | "parse" | "business"

export type RestApiErrorDetails = {
  url: string
  method: string
  status?: number
  statusText?: string
  contentType?: string | null
  bodyPreview?: string
  apiError?: string
  phase: RestApiErrorPhase
}

/** Thrown by REST helpers with enough detail for UI + __DEV__ logs. */
export class RestApiError extends Error {
  readonly details: RestApiErrorDetails

  constructor(shortMessage: string, details: RestApiErrorDetails) {
    super(shortMessage)
    this.name = "RestApiError"
    this.details = details
  }

  /** Multi-line string for AlertModal `message`. */
  formatForUser(): string {
    const d = this.details
    const lines: string[] = [this.message, "", `URL: ${d.url}`, `Method: ${d.method}`]
    if (d.phase !== "network") {
      lines.push(`Phase: ${d.phase}`)
    }
    if (d.status !== undefined) {
      lines.push(`HTTP: ${d.status}${d.statusText ? ` ${d.statusText}` : ""}`)
    }
    if (d.contentType) {
      lines.push(`Content-Type: ${d.contentType}`)
    }
    if (d.apiError) {
      lines.push(`Server error: ${d.apiError}`)
    }
    if (d.bodyPreview) {
      lines.push(`Response body: ${d.bodyPreview}`)
    }
    return lines.join("\n")
  }
}

function logRestFailure(context: string, details: RestApiErrorDetails, extra?: unknown) {
  if (__DEV__) {
    console.warn(`[restApi] ${context}`, details, extra ?? "")
  }
}

type ParsedJson = ApiJsonBody & { success?: boolean; error?: string }

async function readResponseBody(res: Response): Promise<{ text: string; json: ParsedJson | null }> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) {
    return { text, json: {} }
  }
  try {
    return { text, json: JSON.parse(trimmed) as ParsedJson }
  } catch {
    return { text, json: null }
  }
}

export async function postJsonApi<T extends ApiJsonBody = ApiJsonBody>(
  path: string,
  body: ApiJsonBody,
): Promise<T> {
  const url = restApiUrl(path)
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const details: RestApiErrorDetails = { url, method: "POST", phase: "network" }
    logRestFailure("postJsonApi network", details, e)
    throw new RestApiError(`Network error: ${msg}`, details)
  }

  const { text, json } = await readResponseBody(res)
  const ct = res.headers.get("content-type") ?? ""

  if (json === null) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("postJsonApi parse", details)
    throw new RestApiError("Response is not valid JSON", details)
  }

  if (!ct.includes("application/json")) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("postJsonApi content-type", details)
    throw new RestApiError("Server did not return JSON (wrong Content-Type)", details)
  }

  if (!res.ok || json.success === false) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      apiError: json.error,
      phase: json.success === false && res.ok ? "business" : "http",
    }
    logRestFailure("postJsonApi http/business", details)
    throw new RestApiError(json.error || res.statusText || `HTTP ${res.status}`, details)
  }

  return json as T
}

export async function getJsonApi<T extends ApiJsonBody = ApiJsonBody>(path: string): Promise<T> {
  const url = restApiUrl(path)
  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const details: RestApiErrorDetails = { url, method: "GET", phase: "network" }
    logRestFailure("getJsonApi network", details, e)
    throw new RestApiError(`Network error: ${msg}`, details)
  }

  const { text, json } = await readResponseBody(res)
  const ct = res.headers.get("content-type") ?? ""

  if (json === null) {
    const details: RestApiErrorDetails = {
      url,
      method: "GET",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("getJsonApi parse", details)
    throw new RestApiError("Response is not valid JSON", details)
  }

  if (!ct.includes("application/json")) {
    const details: RestApiErrorDetails = {
      url,
      method: "GET",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("getJsonApi content-type", details)
    throw new RestApiError("Server did not return JSON (wrong Content-Type)", details)
  }

  if (!res.ok || json.success === false) {
    const details: RestApiErrorDetails = {
      url,
      method: "GET",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      apiError: json.error,
      phase: json.success === false && res.ok ? "business" : "http",
    }
    logRestFailure("getJsonApi http/business", details)
    throw new RestApiError(json.error || res.statusText || `HTTP ${res.status}`, details)
  }

  return json as T
}

/** POST multipart (do not set Content-Type — browser sets boundary). */
export async function postMultipartApi<T extends ApiJsonBody = ApiJsonBody>(
  apiPath: string,
  formData: FormData,
): Promise<T> {
  const url = restApiUrl(apiPath)
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const details: RestApiErrorDetails = { url, method: "POST", phase: "network" }
    logRestFailure("postMultipartApi network", details, e)
    throw new RestApiError(`Network error: ${msg}`, details)
  }

  const { text, json } = await readResponseBody(res)
  const ct = res.headers.get("content-type") ?? ""

  if (json === null) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("postMultipartApi parse", details)
    throw new RestApiError("Response is not valid JSON", details)
  }

  if (!ct.includes("application/json")) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      phase: "parse",
    }
    logRestFailure("postMultipartApi content-type", details)
    throw new RestApiError("Server did not return JSON (wrong Content-Type)", details)
  }

  if (!res.ok || json.success === false) {
    const details: RestApiErrorDetails = {
      url,
      method: "POST",
      status: res.status,
      statusText: res.statusText,
      contentType: ct || null,
      bodyPreview: truncateBody(text),
      apiError: json.error,
      phase: json.success === false && res.ok ? "business" : "http",
    }
    logRestFailure("postMultipartApi http/business", details)
    throw new RestApiError(json.error || res.statusText || `HTTP ${res.status}`, details)
  }

  return json as T
}
