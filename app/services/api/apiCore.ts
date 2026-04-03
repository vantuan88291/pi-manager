import { create, type ApisauceInstance } from "apisauce"

import Config from "@/config"
import { socketManager } from "@/services/socket/SocketManager"
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

import type { ApiConfig } from "./types"

/**
 * Pi Manager backend (REST + same origin as Socket.IO).
 * `Config.API_URL` is set in config.dev / config.prod from `getBackendBaseUrl()`.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

function isFormDataLike(data: unknown): boolean {
  return (
    typeof FormData !== "undefined" &&
    data !== null &&
    typeof data === "object" &&
    typeof (data as FormData).append === "function"
  )
}

/**
 * Apisauce client for the Pi server. Default JSON Content-Type is not set globally
 * so multipart requests get the correct boundary from axios.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    const base = this.config.url.replace(/\/$/, "") || getBackendBaseUrl()
    this.apisauce = create({
      baseURL: base,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })

    this.apisauce.axiosInstance.interceptors.request.use((req) => {
      const token = socketManager.getSessionToken()
      if (token && req.headers) {
        const h = req.headers as Record<string, unknown>
        h.Authorization = `Bearer ${token}`
      }
      if (isFormDataLike(req.data) && req.headers) {
        const h = req.headers as Record<string, unknown>
        delete h["Content-Type"]
        delete h["content-type"]
      }
      return req
    })
  }
}

export const api = new Api()
