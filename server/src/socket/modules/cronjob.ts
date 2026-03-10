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
const jobsCache = new Map<string, CronJob>()

async function runOpenClawCommand(args: string[]): Promise<string> {
  const command = `openclaw ${args.join(" ")}`
  console.log("[cronjob] executing:", command)
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
    if (stderr && !stderr.includes("warn")) {
      console.warn("[cronjob] stderr:", stderr)
    }
    return stdout.trim()
  } catch (error: any) {
    console.error("[cronjob] command failed:", error.message)
    throw new Error(`OpenClaw command failed: ${error.stderr || error.message}`)
  }
}

function parseJobsList(output: string): CronJob[] {
  const jobs: CronJob[] = []
  if (!output || output.trim() === "") return jobs
  
  const lines = output.trim().split("\n")
  console.log("[cronjob] parsing", lines.length, "lines")
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim() === "") continue
    
    // Parse by fixed column positions
    const jobId = line.substring(0, 36).trim()
    const name = line.substring(36, 61).trim() || "Untitled"
    const scheduleStr = line.substring(61, 94).trim() || ""
    const nextRun = line.substring(94, 105).trim() || ""
    const status = line.substring(115, 125).trim() || ""
    const target = line.substring(125, 135).trim() || "isolated"
    
    console.log("[cronjob] parsed:", { jobId, name, status })
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      console.warn("[cronjob] invalid UUID:", line.substring(0, 50))
      continue
    }
    
    // Parse cron expression from schedule
    let cronExpr = "* * * * *"
    let timezone = "Asia/Saigon"
    if (scheduleStr.includes("cron")) {
      const parts = scheduleStr.split(/\s+/)
      if (parts.length >= 6) {
        cronExpr = parts.slice(1, 6).join(" ")
        if (parts[6] === "@") timezone = parts[7] || "Asia/Saigon"
      }
    }
    
    // Parse next run time
    let nextRunAt: number | undefined
    if (nextRun && nextRun !== "-" && nextRun !== "now") {
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
    
    jobs.push({
      jobId,
      name,
      enabled: status === "idle" || status === "running",
      schedule: { kind: "cron" as const, expr: cronExpr, tz: timezone },
      payload: { kind: "systemEvent" as const, text: `Job: ${name}` },
      sessionTarget: target as "main" | "isolated" || "isolated",
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      nextRunAt,
    })
  }
  
  console.log("[cronjob] parsed", jobs.length, "jobs")
  return jobs
}

export const cronjobModule: ServerSocketModule = {
  name: "cronjob",

  register(socket: Socket, io: Server) {
    console.log("[cronjob] module registered")

    socket.on("cronjob:list", async () => {
      try {
        console.log("[cronjob] list requested")
        const output = await runOpenClawCommand(["cron", "list"])
        const jobs = parseJobsList(output)
        jobs.forEach((job) => jobsCache.set(job.jobId, job))
        socket.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        console.error("[cronjob] list error:", err.message)
        socket.emit("cronjob:list_response", { jobs: [] })
      }
    })

    socket.on("cronjob:create", async (request: CreateCronJobRequest) => {
      try {
        console.log("[cronjob] create:", request.name || "Untitled")
        let args = ["cron", "add"]
        
        if (request.name) args.push("--name", `"${request.name}"`)
        
        // Schedule
        if (request.schedule.kind === "cron") {
          args.push("--cron", `"${request.schedule.expr}"`)
        } else if (request.schedule.kind === "every") {
          const mins = Math.floor(request.schedule.everyMs / 60000)
          args.push("--every", `${mins}m`)
        }
        
        // Payload
        // Session target (required for --announce)
        args.push("--session", request.sessionTarget || "isolated")
        
        // Payload
        if (request.payload.kind === "agentTurn") {
          args.push("--agent", "main")
          args.push("--message", `"${request.payload.message}"`)
          if (request.payload.model && request.payload.model !== "auto") {
            args.push("--model", request.payload.model)
          }
        } else if (request.payload.kind === "systemEvent") {
          args.push("--system-event", `"${request.payload.text}"`)
        }
        
        // Delivery
        args.push("--announce")
        
        // Session target
        if (request.sessionTarget === "isolated") {
          args.push("--agent", "main")  // isolated = run agent
        }
        
        await runOpenClawCommand(args)
        // Fetch updated list and broadcast to all clients
        setTimeout(async () => {
          try {
            const output = await runOpenClawCommand(["cron", "list"])
            const jobs = parseJobsList(output)
            io.emit("cronjob:list_response", { jobs })
          } catch (err) {
            console.error("[cronjob] failed to refresh list:", err)
          }
        }, 500)
      } catch (err: any) {
        console.error("[cronjob] create error:", err.message)
        socket.emit("cronjob:error", { code: "CREATE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:remove", async ({ jobId }: { jobId: string }) => {
      try {
        console.log("[cronjob] remove:", jobId)
        await runOpenClawCommand(["cron", "remove", jobId])
        jobsCache.delete(jobId)
        io.emit("cronjob:removed", { jobId })
        socket.emit("cronjob:removed", { jobId, success: true })
      } catch (err: any) {
        console.error("[cronjob] remove error:", err.message)
        socket.emit("cronjob:error", { code: "REMOVE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:run", async ({ jobId }: { jobId: string }) => {
      try {
        console.log("[cronjob] run:", jobId)
        await runOpenClawCommand(["cron", "run", jobId])
        socket.emit("cronjob:run_response", { success: true })
      } catch (err: any) {
        console.error("[cronjob] run error:", err.message)
        socket.emit("cronjob:error", { code: "RUN_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:toggle", async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      try {
        console.log("[cronjob] toggle:", jobId, enabled)
        await runOpenClawCommand(["cron", enabled ? "enable" : "disable", jobId])
        const job = jobsCache.get(jobId)
        if (job) jobsCache.set(jobId, { ...job, enabled })
        setTimeout(() => socket.emit("cronjob:list_request"), 500)
      } catch (err: any) {
        console.error("[cronjob] toggle error:", err.message)
        socket.emit("cronjob:error", { code: "TOGGLE_FAILED", message: err.message })
      }
    })

    // Get run history
    socket.on("cronjob:runs", async ({ jobId, limit = 10 }: { jobId: string; limit?: number }) => {
      try {
        console.log("[cronjob] runs:", jobId, "limit:", limit)
        const output = await runOpenClawCommand(["cron", "runs", jobId, "--limit", String(limit)])
        // Parse runs from CLI output (simplified - just return raw for now)
        socket.emit("cronjob:runs_response", { runs: [], raw: output })
      } catch (err: any) {
        console.error("[cronjob] runs error:", err.message)
        socket.emit("cronjob:error", { code: "RUNS_FAILED", message: err.message })
      }
    })
  },

  onSubscribe(socket: Socket) {
    console.log("[cronjob] subscribed:", socket.id)
    socket.emit("cronjob:list_request")
  },

  onUnsubscribe(socket: Socket) {
    console.log("[cronjob] unsubscribed:", socket.id)
  },
}
