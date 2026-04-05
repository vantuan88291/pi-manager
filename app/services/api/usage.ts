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
  totalRequests?: number
  totalPromptTokens?: number
  totalCompletionTokens?: number
}

export async function fetchModelUsageHistory(): Promise<ModelUsageHistory> {
  return getJsonApi<ModelUsageHistory>("/api/model-usage/history")
}
