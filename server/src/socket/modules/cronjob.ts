import { exec } from "node:child_process"
import { promisify } from "node:util"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type {
  CronJob,
  CreateCronJobRequest,
  CronJobListResponse,
} from "../../../../shared/types/cronjob.js"

const execAsync = promisify(exec)

// Simple in-memory cache for jobs
const jobsCache = new Map<string, CronJob>()

/**
 * Execute OpenClaw CLI command
 */
async function runOpenClawCommand(args: string[]): Promise<string> {
  const command = `openclaw ${args.join(" ")}`
  console.log("[cronjob] executing:", command)
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30s timeout
    })
    
    if (stderr && !stderr.includes("warn")) {
      console.warn("[cronjob] stderr:", stderr)
    }
    
    return stdout.trim()
  } catch (error: any) {
    console.error("[cronjob] command failed:", error.message)
    throw new Error(`OpenClaw command failed: ${error.stderr || error.message}`)
  }
}

/**
 * Parse CLI output to CronJob array
 */
function parseJobsList(output: string): CronJob[] {
  try {
    // CLI output might be JSON or formatted text
    // Try to parse as JSON first
    const parsed = JSON.parse(output)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // If not JSON, return empty array
    console.warn("[cronjob] could not parse output as JSON")
    return []
  }
}

export const cronjobModule: ServerSocketModule = {
  name: "cronjob",

  register(socket: Socket, io: Server) {
    console.log("[cronjob] module registered for socket:", socket.id)
    console.log("[cronjob] module registered")

    // List all cron jobs
    socket.on("cronjob:list", async () => {
      try {
        console.log("[cronjob] list requested")
        const output = await runOpenClawCommand(["cron", "list"])
        const jobs = parseJobsList(output)
        
        // Cache the jobs
        jobs.forEach((job) => jobsCache.set(job.jobId, job))
        
        socket.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        console.error("[cronjob] list error:", err.message)
        // Return empty list instead of error
        socket.emit("cronjob:list_response", { jobs: [] })
      }
    })

    // Create new cron job
    socket.on("cronjob:create", async (request: CreateCronJobRequest) => {
      try {
        console.log("[cronjob] create requested:", request.name || "Untitled")
        
        // Build cron command based on schedule type
        let cronArgs: string[] = ["cron", "add"]
        
        // Add name
        if (request.name) {
          cronArgs.push("--name", `"${request.name}"`)
        }
        
        // Add schedule
        if (request.schedule.kind === "cron") {
          cronArgs.push("--cron", `"${request.schedule.expr}"`)
        } else if (request.schedule.kind === "every") {
          const minutes = Math.floor(request.schedule.everyMs / 60000)
          cronArgs.push("--every", `${minutes}m`)
        }
        
        // Add payload
        if (request.payload.kind === "systemEvent") {
          cronArgs.push("--system-event", `"${request.payload.text}"`)
        } else if (request.payload.kind === "agentTurn") {
          cronArgs.push("--agent-turn", `"${request.payload.message}"`)
          if (request.payload.model) {
            cronArgs.push("--model", request.payload.model)
          }
        }
        
        // Add session target
        cronArgs.push("--session-target", request.sessionTarget)
        
        // Execute command
        const output = await runOpenClawCommand(cronArgs)
        console.log("[cronjob] create output:", output)
        
        // Emit success (we'll re-fetch list to get the new job)
        socket.emit("cronjob:created", { success: true })
        
        // Request updated list
        setTimeout(() => {
          socket.emit("cronjob:list_request")
        }, 500)
      } catch (err: any) {
        console.error("[cronjob] create error:", err.message)
        socket.emit("cronjob:error", {
          code: "CREATE_FAILED",
          message: err.message,
        })
      }
    })

    // Remove cron job
    socket.on("cronjob:remove", async ({ jobId }: { jobId: string }) => {
      try {
        console.log("[cronjob] remove requested:", jobId)
        
        await runOpenClawCommand(["cron", "remove", jobId])
        
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
        
        await runOpenClawCommand(["cron", "run", jobId])
        
        socket.emit("cronjob:run_response", { success: true })
      } catch (err: any) {
        console.error("[cronjob] run error:", err.message)
        socket.emit("cronjob:error", {
          code: "RUN_FAILED",
          message: err.message,
        })
      }
    })

    // Toggle job enabled state (convenience method)
    socket.on("cronjob:toggle", async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      try {
        console.log("[cronjob] toggle requested:", jobId, "enabled:", enabled)
        
        const command = enabled ? "enable" : "disable"
        await runOpenClawCommand(["cron", command, jobId])
        
        // Update cache
        const job = jobsCache.get(jobId)
        if (job) {
          jobsCache.set(jobId, { ...job, enabled })
        }
        
        // Request updated list
        setTimeout(() => {
          socket.emit("cronjob:list_request")
        }, 500)
      } catch (err: any) {
        console.error("[cronjob] toggle error:", err.message)
        socket.emit("cronjob:error", {
          code: "TOGGLE_FAILED",
          message: err.message,
        })
      }
    })
  },

  onSubscribe(socket: Socket) {
    console.log("[cronjob] socket subscribed:", socket.id)
    // Auto-request list when client subscribes
    socket.emit("cronjob:list_request")
  },

  onUnsubscribe(socket: Socket) {
    console.log("[cronjob] socket unsubscribed:", socket.id)
    // Cleanup if needed
  },
}
