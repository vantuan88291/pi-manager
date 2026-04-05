import { getJsonApi } from "./piApi"

export interface ModelUsageRequest {
  timestamp: string
  model: string
  provider: string
  promptTokens: number
  completionTokens: number
  status: string
}

export interface ModelUsageHistory {
  recentRequests: ModelUsageRequest[]
}

export async function fetchModelUsageHistory(): Promise<ModelUsageHistory> {
  return getJsonApi<ModelUsageHistory>("/api/usage/history")
}
