// Cronjob Types for OpenClaw Gateway Integration

export interface CronJob {
  jobId: string           // Unique identifier (UUID)
  name?: string           // Human-readable name
  enabled: boolean        // Is job active?
  schedule: Schedule      // When to run
  payload: CronPayload    // What to execute
  delivery?: Delivery     // How to notify
  sessionTarget: "main" | "isolated"
  createdAt: number       // Unix timestamp
  updatedAt: number       // Unix timestamp
  lastRunAt?: number      // Last execution time
  nextRunAt?: number      // Next scheduled time
}

export type Schedule = 
  | { kind: "at"; at: string }              // ISO-8601 timestamp
  | { kind: "every"; everyMs: number; anchorMs?: number }  // Recurring interval
  | { kind: "cron"; expr: string; tz?: string }  // Cron expression

export type CronPayload =
  | { kind: "systemEvent"; text: string }   // Inject system event
  | { kind: "agentTurn"; message: string; model?: string; timeoutSeconds?: number }  // Run agent

export interface Delivery {
  mode: "none" | "announce" | "webhook"
  channel?: string      // For announce: target channel
  to?: string           // For webhook: URL
  bestEffort?: boolean  // Don't fail if delivery fails
}

export interface JobRun {
  runId: string
  jobId: string
  startedAt: number
  finishedAt?: number
  status: "running" | "success" | "failed" | "timeout"
  result?: any
  error?: string
}

// Request/Response Types

export interface CreateCronJobRequest {
  name?: string
  schedule: Schedule
  payload: CronPayload
  delivery?: Delivery
  sessionTarget: "main" | "isolated"
  enabled?: boolean
}

export interface UpdateCronJobRequest {
  jobId: string
  patch: Partial<CronJob>
}

export interface CronJobListResponse {
  jobs: CronJob[]
}

export interface CronJobCreateResponse {
  job: CronJob
}

export interface CronJobUpdateResponse {
  job: CronJob
}

export interface CronJobRemoveResponse {
  success: boolean
}

export interface CronJobRunResponse {
  success: boolean
  runId?: string
}

export interface CronJobRunsResponse {
  runs: JobRun[]
}

export interface CronJobError {
  code: string
  message: string
}
