import type { ApiResponse } from "apisauce"

import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

import { api } from "./apiCore"

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

/** Thrown by Pi API helpers with enough detail for UI + __DEV__ logs. */
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

type ParsedJson = ApiJsonBody & { success?: boolean; error?: string }

function logPiApiFailure(context: string, details: RestApiErrorDetails, extra?: unknown) {
  if (__DEV__) {
    console.warn(`[piApi] ${context}`, details, extra ?? "")
  }
}

function resolveRequestUrl(path: string): string {
  const base = getBackendBaseUrl().replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

function syncPiBaseUrl() {
  const base = getBackendBaseUrl().replace(/\/$/, "")
  api.apisauce.setBaseURL(base)
}

function getContentType(headers: unknown): string {
  if (!headers || typeof headers !== "object") return ""
  const maybeGet = (headers as { get?: (k: string) => unknown }).get
  if (typeof maybeGet === "function") {
    return String(maybeGet.call(headers, "content-type") ?? "")
  }
  const h = headers as Record<string, string>
  return String(h["content-type"] ?? h["Content-Type"] ?? "")
}

function normalizeApisauceData(data: unknown): { json: ParsedJson | null; textPreview: string } {
  if (data === null || data === undefined) {
    return { json: null, textPreview: "" }
  }
  if (typeof data === "string") {
    const trimmed = data.trim()
    if (!trimmed) return { json: {}, textPreview: "" }
    try {
      return { json: JSON.parse(trimmed) as ParsedJson, textPreview: truncateBody(trimmed) }
    } catch {
      return { json: null, textPreview: truncateBody(trimmed) }
    }
  }
  if (typeof data === "object") {
    return { json: data as ParsedJson, textPreview: truncateBody(JSON.stringify(data)) }
  }
  return { json: null, textPreview: String(data) }
}

const NETWORKISH_PROBLEMS = new Set(["NETWORK_ERROR", "CONNECTION_ERROR", "TIMEOUT_ERROR"])

async function handlePiResponse<T extends ApiJsonBody>(
  method: string,
  path: string,
  response: ApiResponse<unknown>,
): Promise<T> {
  const url = resolveRequestUrl(path)
  const status = response.status ?? undefined
  const statusText = ""

  if (response.problem && NETWORKISH_PROBLEMS.has(response.problem)) {
    const msg =
      response.originalError && "message" in response.originalError
        ? String((response.originalError as Error).message)
        : "Network request failed"
    const details: RestApiErrorDetails = { url, method, phase: "network" }
    logPiApiFailure(`${method} network`, details, response.originalError)
    throw new RestApiError(`Network error: ${msg}`, details)
  }

  const ct = getContentType(response.headers)
  const { json, textPreview } = normalizeApisauceData(response.data)

  if (json === null) {
    const details: RestApiErrorDetails = {
      url,
      method,
      status,
      statusText,
      contentType: ct || null,
      bodyPreview: textPreview,
      phase: "parse",
    }
    logPiApiFailure(`${method} parse`, details)
    throw new RestApiError("Response is not valid JSON", details)
  }

  if (ct && !ct.includes("application/json")) {
    const details: RestApiErrorDetails = {
      url,
      method,
      status,
      statusText,
      contentType: ct || null,
      bodyPreview: textPreview,
      phase: "parse",
    }
    logPiApiFailure(`${method} content-type`, details)
    throw new RestApiError("Server did not return JSON (wrong Content-Type)", details)
  }

  if (!response.ok || json.success === false) {
    const details: RestApiErrorDetails = {
      url,
      method,
      status,
      statusText,
      contentType: ct || null,
      bodyPreview: textPreview,
      apiError: json.error,
      phase: json.success === false && response.ok ? "business" : "http",
    }
    logPiApiFailure(`${method} http/business`, details)
    throw new RestApiError(json.error || statusText || `HTTP ${status ?? "?"}`, details)
  }

  return json as T
}

export async function getJsonApi<T extends ApiJsonBody = ApiJsonBody>(path: string): Promise<T> {
  syncPiBaseUrl()
  const response = await api.apisauce.get(path)
  return handlePiResponse<T>("GET", path, response)
}

export async function postJsonApi<T extends ApiJsonBody = ApiJsonBody>(
  path: string,
  body: ApiJsonBody,
): Promise<T> {
  syncPiBaseUrl()
  const response = await api.apisauce.post(path, body, {
    headers: { "Content-Type": "application/json" },
  })
  return handlePiResponse<T>("POST", path, response)
}

export async function deleteJsonApi<T extends ApiJsonBody = ApiJsonBody>(path: string): Promise<T> {
  syncPiBaseUrl()
  const response = await api.apisauce.delete(path)
  return handlePiResponse<T>("DELETE", path, response)
}

export async function postMultipartApi<T extends ApiJsonBody = ApiJsonBody>(
  apiPath: string,
  formData: FormData,
): Promise<T> {
  syncPiBaseUrl()
  const response = await api.apisauce.post(apiPath, formData, {})
  return handlePiResponse<T>("POST", apiPath, response)
}

/** Same base URL as Socket.IO. */
export function getPiApiBaseUrl(): string {
  return getBackendBaseUrl()
}
