import { randomUUID } from "node:crypto"
import { exec } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { promisify } from "node:util"
import type { Server, Socket } from "socket.io"
import type { ServerSocketModule } from "../types.js"
import type {
  CronJob,
  CreateCronJobRequest,
  UpdateCronJobRequest,
} from "../../../../shared/types/cronjob.js"

const JOBS_JSON_PATH = "/home/vantuan88291/.openclaw/cron/jobs.json"
const CRON_JOB_ID_MARKER = "PI_MANAGER_JOB_ID="
const SHELL_PREFIX = "🖥️ Running: "

const execAsync = promisify(exec)
const jobsCache = new Map<string, CronJob>()

interface JsonJobsFile {
  jobs?: Array<Record<string, unknown>>
  [key: string]: unknown
}

function shQuote(input: string): string {
  return `'${input.replace(/'/g, `'"'"'`)}'`
}

function extractShellCommand(payload: CronJob["payload"]): string {
  if (payload.kind === "systemEvent") {
    const text = payload.text?.trim() || ""
    if (text.startsWith(SHELL_PREFIX)) return text.slice(SHELL_PREFIX.length).trim()
    return `echo ${shQuote(text || "Scheduled event")}`
  }

  // Backward compatibility for old agentTurn jobs
  const msg = payload.message?.trim() || "Scheduled agent job"
  return `echo ${shQuote(msg)}`
}

function scheduleToCronExpr(schedule: CronJob["schedule"]): string | null {
  if (schedule.kind === "cron") return schedule.expr

  if (schedule.kind === "every") {
    const everyMs = Math.max(60000, schedule.everyMs)
    if (everyMs % 86400000 === 0) {
      const days = Math.max(1, Math.floor(everyMs / 86400000))
      return `0 0 */${days} * *`
    }
    if (everyMs % 3600000 === 0) {
      const hours = Math.max(1, Math.floor(everyMs / 3600000))
      return `0 */${hours} * * *`
    }
    const minutes = Math.max(1, Math.floor(everyMs / 60000))
    return `*/${minutes} * * * *`
  }

  const when = new Date(schedule.at)
  if (Number.isNaN(when.getTime())) return null
  const min = when.getMinutes()
  const hour = when.getHours()
  const dom = when.getDate()
  const month = when.getMonth() + 1
  return `${min} ${hour} ${dom} ${month} *`
}

function mapJsonJobRowToCronJob(job: Record<string, unknown>): CronJob {
  const j = job as {
    id: string
    name?: string
    enabled?: boolean
    schedule?: CronJob["schedule"]
    payload?: CronJob["payload"]
    sessionTarget?: CronJob["sessionTarget"]
    createdAtMs?: number
    updatedAtMs?: number
    state?: { lastRunAtMs?: number; nextRunAtMs?: number }
  }

  const now = Date.now()
  return {
    jobId: j.id,
    name: j.name || "Untitled",
    enabled: j.enabled ?? true,
    schedule: j.schedule || { kind: "cron", expr: "* * * * *", tz: "Asia/Saigon" },
    payload: j.payload || { kind: "systemEvent", text: `${SHELL_PREFIX}echo 'Untitled job'` },
    sessionTarget: j.sessionTarget || "main",
    createdAt: j.createdAtMs ?? now,
    updatedAt: j.updatedAtMs ?? now,
    lastRunAt: j.state?.lastRunAtMs,
    nextRunAt: j.state?.nextRunAtMs,
  }
}

function readJobsFile(): JsonJobsFile {
  if (!existsSync(JOBS_JSON_PATH)) return { jobs: [] }
  try {
    const raw = readFileSync(JOBS_JSON_PATH, "utf8")
    const parsed = JSON.parse(raw) as JsonJobsFile
    if (!Array.isArray(parsed.jobs)) parsed.jobs = []
    return parsed
  } catch {
    return { jobs: [] }
  }
}

function writeJobsFile(data: JsonJobsFile): void {
  mkdirSync(dirname(JOBS_JSON_PATH), { recursive: true })
  writeFileSync(JOBS_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`)
}

function parseManagedIdsFromCrontab(lines: string[]): Set<string> {
  const ids = new Set<string>()
  for (const line of lines) {
    const m = line.match(/#\s*PI_MANAGER_JOB_ID=([0-9a-f-]+)/i)
    if (m?.[1]) ids.add(m[1])
  }
  return ids
}

async function readSystemCrontabLines(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("sudo crontab -l", { timeout: 10000 })
    return stdout
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
  } catch (error: any) {
    const stderr = String(error?.stderr || error?.message || "")
    if (stderr.toLowerCase().includes("no crontab")) return []
    throw error
  }
}

async function writeSystemCrontabLines(lines: string[]): Promise<void> {
  const tempPath = join(tmpdir(), `pi-manager-crontab-${Date.now()}.txt`)
  const content = `${lines.join("\n")}\n`

  writeFileSync(tempPath, content)
  try {
    await execAsync(`sudo crontab ${shQuote(tempPath)}`, { timeout: 10000 })
  } finally {
    try {
      unlinkSync(tempPath)
    } catch {
      // ignore cleanup errors
    }
  }
}

function buildCrontabLine(job: CronJob): string | null {
  if (!job.enabled) return null
  const expr = scheduleToCronExpr(job.schedule)
  if (!expr) return null

  const command = extractShellCommand(job.payload)
  if (!command) return null

  return `${expr} /bin/bash -lc ${shQuote(command)} # ${CRON_JOB_ID_MARKER}${job.jobId}`
}

async function syncJobsToSystemCrontab(jobs: CronJob[]): Promise<void> {
  const current = await readSystemCrontabLines()
  const kept = current.filter((line) => !line.includes(CRON_JOB_ID_MARKER))

  const managed = jobs
    .map((job) => buildCrontabLine(job))
    .filter((line): line is string => !!line)

  await writeSystemCrontabLines([...kept, ...managed])
}

function toJobsFromFile(fileData: JsonJobsFile): CronJob[] {
  const rows = Array.isArray(fileData.jobs) ? fileData.jobs : []
  return rows.map((row) => mapJsonJobRowToCronJob(row))
}

function refreshCache(jobs: CronJob[]): void {
  jobsCache.clear()
  jobs.forEach((job) => jobsCache.set(job.jobId, job))
}

export const cronjobModule: ServerSocketModule = {
  name: "cronjob",

  register(socket: Socket, io: Server) {
    socket.on("cronjob:list", async () => {
      try {
        const fileData = readJobsFile()
        const jobs = toJobsFromFile(fileData)

        const activeIds = parseManagedIdsFromCrontab(await readSystemCrontabLines())
        const normalized = jobs.map((job) => ({ ...job, enabled: activeIds.has(job.jobId) }))

        // Keep JSON enabled flag in sync with actual crontab
        fileData.jobs = normalized.map((job) => ({
          id: job.jobId,
          name: job.name,
          enabled: job.enabled,
          schedule: job.schedule,
          payload: job.payload,
          sessionTarget: job.sessionTarget,
          createdAtMs: job.createdAt,
          updatedAtMs: Date.now(),
        }))
        writeJobsFile(fileData)

        refreshCache(normalized)
        socket.emit("cronjob:list_response", { jobs: normalized })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "LIST_FAILED", message: err.message })
        socket.emit("cronjob:list_response", { jobs: [] })
      }
    })

    socket.on("cronjob:create", async (request: CreateCronJobRequest) => {
      try {
        const fileData = readJobsFile()
        const rows = Array.isArray(fileData.jobs) ? fileData.jobs : []

        const id = randomUUID()
        const now = Date.now()
        const row: Record<string, unknown> = {
          id,
          name: request.name || "Untitled Job",
          enabled: request.enabled ?? true,
          schedule: request.schedule,
          payload: request.payload,
          sessionTarget: request.sessionTarget || "main",
          delivery: request.delivery,
          createdAtMs: now,
          updatedAtMs: now,
        }

        rows.push(row)
        fileData.jobs = rows
        writeJobsFile(fileData)

        const jobs = toJobsFromFile(fileData)
        await syncJobsToSystemCrontab(jobs)

        const created = jobs.find((j) => j.jobId === id)
        if (created) io.emit("cronjob:created", { job: created })

        refreshCache(jobs)
        io.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "CREATE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:update", async (request: UpdateCronJobRequest) => {
      try {
        const { jobId, patch } = request
        if (!jobId) {
          socket.emit("cronjob:error", { code: "UPDATE_FAILED", message: "Missing jobId" })
          return
        }

        const fileData = readJobsFile()
        const rows = Array.isArray(fileData.jobs) ? fileData.jobs : []
        const idx = rows.findIndex((j) => (j as { id?: string }).id === jobId)

        if (idx < 0) {
          socket.emit("cronjob:error", { code: "NOT_FOUND", message: "Job not found" })
          return
        }

        const existing = rows[idx] as Record<string, unknown>
        const merged: Record<string, unknown> = { ...existing, updatedAtMs: Date.now() }

        if (patch.name !== undefined) merged.name = patch.name
        if (patch.enabled !== undefined) merged.enabled = patch.enabled
        if (patch.schedule !== undefined) merged.schedule = patch.schedule
        if (patch.payload !== undefined) merged.payload = patch.payload
        if (patch.sessionTarget !== undefined) merged.sessionTarget = patch.sessionTarget
        if (patch.delivery !== undefined) merged.delivery = patch.delivery

        rows[idx] = merged
        fileData.jobs = rows
        writeJobsFile(fileData)

        const jobs = toJobsFromFile(fileData)
        await syncJobsToSystemCrontab(jobs)

        const updated = jobs.find((j) => j.jobId === jobId)
        if (updated) io.emit("cronjob:updated", { job: updated })

        refreshCache(jobs)
        io.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "UPDATE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:remove", async ({ jobId }: { jobId: string }) => {
      try {
        const fileData = readJobsFile()
        const rows = Array.isArray(fileData.jobs) ? fileData.jobs : []
        fileData.jobs = rows.filter((j) => (j as { id?: string }).id !== jobId)
        writeJobsFile(fileData)

        const jobs = toJobsFromFile(fileData)
        await syncJobsToSystemCrontab(jobs)

        jobsCache.delete(jobId)
        io.emit("cronjob:removed", { jobId })
        io.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "REMOVE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:toggle", async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      try {
        const fileData = readJobsFile()
        const rows = Array.isArray(fileData.jobs) ? fileData.jobs : []
        const idx = rows.findIndex((j) => (j as { id?: string }).id === jobId)

        if (idx < 0) {
          socket.emit("cronjob:error", { code: "NOT_FOUND", message: "Job not found" })
          return
        }

        const row = rows[idx] as Record<string, unknown>
        rows[idx] = { ...row, enabled, updatedAtMs: Date.now() }
        fileData.jobs = rows
        writeJobsFile(fileData)

        const jobs = toJobsFromFile(fileData)
        await syncJobsToSystemCrontab(jobs)

        const updated = jobs.find((j) => j.jobId === jobId)
        if (updated) io.emit("cronjob:updated", { job: updated })

        refreshCache(jobs)
        io.emit("cronjob:list_response", { jobs })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "TOGGLE_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:run", async ({ jobId }: { jobId: string }) => {
      try {
        const fileData = readJobsFile()
        const jobs = toJobsFromFile(fileData)
        const job = jobs.find((j) => j.jobId === jobId)

        if (!job) {
          socket.emit("cronjob:error", { code: "NOT_FOUND", message: "Job not found" })
          return
        }

        const command = extractShellCommand(job.payload)
        await execAsync(`/bin/bash -lc ${shQuote(command)}`, { timeout: 60000 })
        socket.emit("cronjob:run_response", { success: true })
      } catch (err: any) {
        socket.emit("cronjob:error", { code: "RUN_FAILED", message: err.message })
      }
    })

    socket.on("cronjob:runs", async (_: { jobId: string; limit?: number }) => {
      socket.emit("cronjob:runs_response", { runs: [] })
    })
  },

  onSubscribe(socket: Socket) {
    socket.emit("cronjob:list_request")
  },

  onUnsubscribe(_socket: Socket) {
    // no-op
  },
}
