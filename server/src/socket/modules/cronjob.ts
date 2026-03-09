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
 * Parse CLI table output to CronJob array
 * Format: ID  Name  Schedule  Next  Last  Status  Target  Agent
 * Example:
 * ID                                   Name                     Schedule                         Next       Last       Status    Target    Agent     
 * 3e5ef3cf-d78e-4ec3-81a6-e8e680c4e030 Auto Shutdown 22:25      cron 25 22 * * * @ Asia/Saigo... in 20m     -          idle      isolated  main
 */
function parseJobsList(output: string): CronJob[] {
  const jobs: CronJob[] = []
  
  if (!output || output.trim() === "") {
    return jobs
  }
  
  const lines = output.trim().split("\n")
  console.log("[cronjob] parsing", lines.length, "lines")
  
  // Skip header line (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    console.log("[cronjob] line", i, ":", line.substring(0, 100))
    
    if (!line || line.trim() === "") continue
    
    // UUID is always 36 chars, followed by spaces
    // Extract jobId (first 36 chars should be UUID)
    const jobId = line.substring(0, 36).trim()
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      console.warn("[cronjob] invalid UUID in line:", line.substring(0, 50))
      continue
    }
    
    // Rest of the line after UUID and spaces
    const rest = line.substring(36).trim()
    
    // Split by multiple spaces (3 or more to avoid splitting schedule)
    const parts = rest.split(/\s{3,}/).map(p => p.trim())
    console.log("[cronjob] parts:", parts.length, JSON.stringify(parts))
    
    if (parts.length >= 5) {
      const name = parts[0] || "Untitled"
      const scheduleStr = parts[1] || ""
      const nextRun = parts[2] || ""
      const lastRun = parts[3] || ""
      const status = parts[4] || ""
      const target = parts[5] || "isolated"
      // const target = parts[5] || "isolated"
      // const agent = parts[6] || "main"
      
      // Parse schedule string to extract cron expression
      // Format: "cron 25 22 * * * @ Asia/Saigon" or similar
      let cronExpr = "* * * * *"
      let timezone = "Asia/Saigon"
      
      if (scheduleStr.includes("cron")) {
        const cronParts = scheduleStr.split(/\s+/)
        if (cronParts.length >= 6) {
          cronExpr = cronParts.slice(1, 6).join(" ")
          if (cronParts[6] === "@") {
            timezone = cronParts[7] || "Asia/Saigon"
          }
        }
      }
      
      // Parse next run time
      let nextRunAt: number | undefined
      if (nextRun && nextRun !== "-" && nextRun !== "now") {
        // Try to parse relative time like "in 30m", "in 2h", etc.
        const match = nextRun.match(/in\s+(\d+)([mhd])/)
        if (match) {
          const value = parseInt(match[1])
          const unit = match[2]
          const now = Date.now()
          if (unit === "m") nextRunAt = now + value * 60000
          else if (unit === "h") nextRunAt = now + value * 3600000
          else if (unit === "d") nextRunAt = now + value * 86400000
        }
      }
      
      const enabled = status === "idle" || status === "running"
      
      jobs.push({
        jobId,
        name,
        enabled,
        schedule: {
          kind: "cron" as const,
          expr: cronExpr,
          tz: timezone,
        },
        payload: {
          kind: "systemEvent" as const,
          text: `Job: ${name}`,
        },
        sessionTarget: target as "main" | "isolated" || "isolated",
        createdAt: Date.now() - 86400000, // Approximate
        updatedAt: Date.now(),
        nextRunAt,
      })
      
      console.log("[cronjob] parsed job:", jobId, name, "enabled:", enabled, "status:", status)
    }
  }
  
  console.log("[cronjob] parsed", jobs.length, "jobs total")
  return jobs
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
