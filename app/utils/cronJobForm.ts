import type { TaskType } from "@/components/TaskTypeDropdown"
import type { ScheduleType } from "@/components/CalendarPicker"
import type {
  CreateCronJobRequest,
  CronJob,
  CronPayload,
  Schedule,
} from "../../shared/types/cronjob"

export interface CronJobFormData {
  name: string
  taskType: TaskType
  command?: string
  workingDir?: string
  timeout?: number
  prompt?: string
  model?: string
  message?: string
  scheduleType: ScheduleType
  time?: string
  weekday?: number
  dayOfMonth?: number
  intervalValue?: number
  intervalUnit?: "minutes" | "hours" | "days"
  cronExpression?: string
  notifySuccess?: boolean
  notifyFailure?: boolean
}

const SHELL_PREFIX = "🖥️ Running: "

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function parseFiveFieldCron(expr: string): {
  scheduleType: ScheduleType
  time?: string
  weekday?: number
  dayOfMonth?: number
  cronExpression: string
} | null {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 5) return null
  const slice = parts.length >= 6 ? parts.slice(-5) : parts
  const [minS, hourS, domS, monS, dowS] = slice
  const minute = parseInt(minS, 10)
  const hour = parseInt(hourS, 10)
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null

  if (domS === "*" && monS === "*" && dowS === "*") {
    return { scheduleType: "daily", time: padTime(hour, minute), cronExpression: expr }
  }
  if (domS === "*" && monS === "*" && dowS !== "*") {
    const dow = parseInt(dowS, 10)
    return {
      scheduleType: "weekly",
      time: padTime(hour, minute),
      weekday: Number.isNaN(dow) ? 1 : dow % 7,
      cronExpression: expr,
    }
  }
  if (domS !== "*" && monS === "*") {
    const dom = parseInt(domS, 10)
    return {
      scheduleType: "monthly",
      time: padTime(hour, minute),
      dayOfMonth: Number.isNaN(dom) ? 1 : dom,
      cronExpression: expr,
    }
  }
  return { scheduleType: "custom", cronExpression: expr }
}

function scheduleFromForm(data: CronJobFormData): Schedule {
  switch (data.scheduleType) {
    case "daily":
      return {
        kind: "cron",
        expr: `${data.time ? data.time.split(":")[1] : "0"} ${data.time ? data.time.split(":")[0] : "8"} * * *`,
        tz: "Asia/Saigon",
      }
    case "weekly":
      return {
        kind: "cron",
        expr: `${data.time ? data.time.split(":")[1] : "0"} ${data.time ? data.time.split(":")[0] : "8"} * * ${data.weekday ?? 1}`,
        tz: "Asia/Saigon",
      }
    case "monthly":
      return {
        kind: "cron",
        expr: `${data.time ? data.time.split(":")[1] : "0"} ${data.time ? data.time.split(":")[0] : "8"} ${data.dayOfMonth ?? 1} * *`,
        tz: "Asia/Saigon",
      }
    case "interval": {
      const unitMs =
        data.intervalUnit === "minutes"
          ? 60000
          : data.intervalUnit === "hours"
            ? 3600000
            : 86400000
      return {
        kind: "every",
        everyMs: (data.intervalValue ?? 1) * unitMs,
      }
    }
    case "custom":
      return {
        kind: "cron",
        expr: data.cronExpression || "* * * * *",
        tz: "Asia/Saigon",
      }
    default:
      return {
        kind: "cron",
        expr: "* * * * *",
      }
  }
}

function payloadFromForm(data: CronJobFormData): CronPayload {
  switch (data.taskType) {
    case "shell":
      return {
        kind: "systemEvent",
        text: `${SHELL_PREFIX}${data.command?.trim() ?? ""}`,
      }
    case "agent":
      return {
        kind: "agentTurn",
        message: data.prompt?.trim() || "Check system status",
        model: data.model?.trim() || "auto",
        timeoutSeconds:
          data.timeout && data.timeout >= 1 && data.timeout <= 3600 ? data.timeout : 300,
      }
    case "event":
      return {
        kind: "systemEvent",
        text: data.message?.trim() || "Scheduled event",
      }
  }
}

function deliveryFromForm(data: CronJobFormData): CreateCronJobRequest["delivery"] {
  if (data.notifySuccess === false && data.notifyFailure === false) {
    return { mode: "none" }
  }
  return { mode: "announce" }
}

function sessionTargetFromForm(data: CronJobFormData): "main" | "isolated" {
  return data.taskType === "agent" ? "isolated" : "main"
}

export function formDataToCreateRequest(data: CronJobFormData): CreateCronJobRequest {
  return {
    name: data.name || "Untitled Job",
    schedule: scheduleFromForm(data),
    payload: payloadFromForm(data),
    sessionTarget: sessionTargetFromForm(data),
    delivery: deliveryFromForm(data),
    enabled: true,
  }
}

export function formDataToCronJobPatch(
  data: CronJobFormData,
  current: Pick<CronJob, "enabled">,
): Partial<CronJob> {
  return {
    name: data.name || "Untitled Job",
    schedule: scheduleFromForm(data),
    payload: payloadFromForm(data),
    sessionTarget: sessionTargetFromForm(data),
    delivery: deliveryFromForm(data),
    enabled: current.enabled,
  }
}

export function cronJobToFormData(job: CronJob): Partial<CronJobFormData> {
  const base: Partial<CronJobFormData> = {
    name: job.name ?? "",
    scheduleType: "custom",
    cronExpression: "* * * * *",
    time: "08:00",
    weekday: 1,
    dayOfMonth: 1,
    intervalValue: 1,
    intervalUnit: "hours",
    notifySuccess: true,
    notifyFailure: true,
  }

  if (job.delivery?.mode === "none") {
    base.notifySuccess = false
    base.notifyFailure = false
  }

  if (job.payload.kind === "agentTurn") {
    base.taskType = "agent"
    base.prompt = job.payload.message
    base.model = job.payload.model && job.payload.model !== "auto" ? job.payload.model : ""
    base.timeout = job.payload.timeoutSeconds ?? 300
  } else if (job.payload.kind === "systemEvent") {
    const t = job.payload.text ?? ""
    if (t.startsWith(SHELL_PREFIX)) {
      base.taskType = "shell"
      base.command = t.slice(SHELL_PREFIX.length)
      base.timeout = 60
    } else {
      base.taskType = "event"
      base.message = t
    }
  }

  const sch = job.schedule
  if (sch.kind === "every") {
    base.scheduleType = "interval"
    const ms = sch.everyMs
    if (ms % 86400000 === 0) {
      base.intervalUnit = "days"
      base.intervalValue = Math.max(1, ms / 86400000)
    } else if (ms % 3600000 === 0) {
      base.intervalUnit = "hours"
      base.intervalValue = Math.max(1, ms / 3600000)
    } else {
      base.intervalUnit = "minutes"
      base.intervalValue = Math.max(1, Math.floor(ms / 60000))
    }
  } else if (sch.kind === "cron") {
    base.cronExpression = sch.expr
    const parsed = parseFiveFieldCron(sch.expr)
    if (parsed) {
      base.scheduleType = parsed.scheduleType
      if (parsed.time !== undefined) base.time = parsed.time
      if (parsed.weekday !== undefined) base.weekday = parsed.weekday
      if (parsed.dayOfMonth !== undefined) base.dayOfMonth = parsed.dayOfMonth
      base.cronExpression = parsed.cronExpression
    }
  } else if (sch.kind === "at") {
    base.scheduleType = "custom"
    base.cronExpression = sch.at
  }

  return base
}
