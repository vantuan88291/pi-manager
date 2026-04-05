import { getJsonApi } from "./piApi"

export interface UsageQuota {
  used: number
  total: number
  remaining: number
  resetAt: string | null
  unlimited: boolean
}

export interface UsageTrackerConnection {
  id: string
  provider: string
  name?: string
  plan?: string
  limitReached?: boolean
  quotas?: {
    session?: UsageQuota
    weekly?: UsageQuota
  }
  lastChecked?: string
}

export interface UsageTrackerResponse {
  connections: UsageTrackerConnection[]
}

export async function fetchUsageTracker(): Promise<UsageTrackerResponse> {
  return getJsonApi<UsageTrackerResponse>("/api/usage-tracker")
}
