import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type {
  CronJob,
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronJobListResponse,
  JobRun,
} from "../../../../shared/types/cronjob.js"

// Gateway configuration
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:8080"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

// Simple in-memory cache for jobs (can be replaced with DB later)
const jobsCache = new Map<string, CronJob>()

/**
 * HTTP client for OpenClaw Gateway API
 */
async function gatewayRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GATEWAY_URL}${endpoint}`
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  // Add auth token if available
  if (GATEWAY_TOKEN) {
    headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error")
    throw new Error(`Gateway error (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * Convert frontend schedule format to Gateway format
 */
function formatSchedule(schedule: any) {
  switch (schedule.kind) {
    case "cron":
      return {
        kind: "cron" as const,
        expr: schedule.expr,
        tz: schedule.tz || "Asia/Saigon",
      }
    case "every":
      return {
        kind: "every" as const,
        everyMs: schedule.everyMs,
        anchorMs: schedule.anchorMs,
      }
    case "at":
      return {
        kind: "at" as const,
        at: schedule.at,
      }
    default:
      throw new Error(`Unknown schedule kind: ${(schedule as any).kind}`)
  }
}

/**
 * Convert frontend payload format to Gateway format
 */
function formatPayload(payload: any) {
  switch (payload.kind) {
    case "systemEvent":
      return {
        kind: "systemEvent" as const,
        text: payload.text,
      }
    case "agentTurn":
      return {
        kind: "agentTurn" as const,
        message: payload.message,
        model: payload.model || "auto",
        timeoutSeconds: payload.timeoutSeconds || 300,
      }
    default:
      throw new Error(`Unknown payload kind: ${(payload as any).kind}`)
  }
}

export const cronjobModule: ServerSocketModule = {
  name: "cronjob",

  register(socket: Socket, io: Server) {
    console.log("[cronjob] module registered")

    // List all cron jobs
    socket.on("cronjob:list", async () => {
      try {
        console.log("[cronjob] list requested")
        const result = await gatewayRequest<CronJobListResponse>("/cron/list?includeDisabled=true")
        
        // Cache the jobs
        result.jobs.forEach((job) => jobsCache.set(job.jobId, job))
        
        socket.emit("cronjob:list_response", result)
      } catch (err: any) {
        console.error("[cronjob] list error:", err.message)
        socket.emit("cronjob:error", {
          code: "LIST_FAILED",
          message: err.message,
        })
      }
    })

    // Create new cron job
    socket.on("cronjob:create", async (request: CreateCronJobRequest) => {
      try {
        console.log("[cronjob] create requested:", request.name || "Untitled")
        
        // Format the job for Gateway API
        const jobPayload = {
          name: request.name || "Untitled Job",
          schedule: formatSchedule(request.schedule),
          payload: formatPayload(request.payload),
          delivery: request.delivery || { mode: "announce" as const },
          sessionTarget: request.sessionTarget || "isolated",
          enabled: request.enabled ?? true,
        }

        const result = await gatewayRequest<{ job: CronJob }>("/cron/add", {
          method: "POST",
          body: JSON.stringify({ job: jobPayload }),
        })

        // Cache the new job
        jobsCache.set(result.job.jobId, result.job)

        // Broadcast to all clients
        io.emit("cronjob:created", result)
        
        socket.emit("cronjob:created", result)
      } catch (err: any) {
        console.error("[cronjob] create error:", err.message)
        socket.emit("cronjob:error", {
          code: "CREATE_FAILED",
          message: err.message,
        })
      }
    })

    // Update existing cron job
    socket.on("cronjob:update", async (request: UpdateCronJobRequest) => {
      try {
        console.log("[cronjob] update requested:", request.jobId)
        
        const result = await gatewayRequest<{ job: CronJob }>(`/cron/update/${request.jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ patch: request.patch }),
        })

        // Update cache
        jobsCache.set(result.job.jobId, result.job)

        // Broadcast to all clients
        io.emit("cronjob:updated", result)
        
        socket.emit("cronjob:updated", result)
      } catch (err: any) {
        console.error("[cronjob] update error:", err.message)
        socket.emit("cronjob:error", {
          code: "UPDATE_FAILED",
          message: err.message,
        })
      }
    })

    // Remove cron job
    socket.on("cronjob:remove", async ({ jobId }: { jobId: string }) => {
      try {
        console.log("[cronjob] remove requested:", jobId)
        
        await gatewayRequest<{ success: boolean }>(`/cron/remove/${jobId}`, {
          method: "DELETE",
        })

        // Remove from cache
        jobsCache.delete(jobId)

        // Broadcast to all clients
        io.emit("cronjob:removed", { jobId })
        
        socket.emit("cronjob:removed", { jobId, success: true })
      } catch (err: any) {
        console.error("[cronjob] remove error:", err.message)
        socket.emit("cronjob:error", {
          code: "REMOVE_FAILED",
          message: err.message,
        })
      }
    })

    // Manually trigger cron job
    socket.on("cronjob:run", async ({ jobId }: { jobId: string }) => {
      try {
        console.log("[cronjob] run requested:", jobId)
        
        const result = await gatewayRequest<{ success: boolean; runId?: string }>(
          `/cron/run/${jobId}`,
          {
            method: "POST",
          }
        )

        socket.emit("cronjob:run_response", result)
      } catch (err: any) {
        console.error("[cronjob] run error:", err.message)
        socket.emit("cronjob:error", {
          code: "RUN_FAILED",
          message: err.message,
        })
      }
    })

    // Get run history for a job
    socket.on("cronjob:runs", async ({ jobId, limit }: { jobId: string; limit?: number }) => {
      try {
        console.log("[cronjob] runs requested:", jobId, "limit:", limit || 10)
        
        const query = limit ? `?limit=${limit}` : ""
        const result = await gatewayRequest<{ runs: JobRun[] }>(`/cron/runs/${jobId}${query}`)

        socket.emit("cronjob:runs_response", result)
      } catch (err: any) {
        console.error("[cronjob] runs error:", err.message)
        socket.emit("cronjob:error", {
          code: "RUNS_FAILED",
          message: err.message,
        })
      }
    })

    // Toggle job enabled state (convenience method)
    socket.on("cronjob:toggle", async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      try {
        console.log("[cronjob] toggle requested:", jobId, "enabled:", enabled)
        
        const result = await gatewayRequest<{ job: CronJob }>(`/cron/update/${jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ patch: { enabled } }),
        })

        // Update cache
        jobsCache.set(result.job.jobId, result.job)

        // Broadcast to all clients
        io.emit("cronjob:updated", result)
        
        socket.emit("cronjob:updated", result)
      } catch (err: any) {
        console.error("[cronjob] toggle error:", err.message)
        socket.emit("cronjob:error", {
          code: "TOGGLE_FAILED",
          message: err.message,
        })
      }
    })
  },
}
