import type {
  CronJob,
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronJobListResponse,
  CronJobCreateResponse,
  CronJobUpdateResponse,
  CronJobRemoveResponse,
  CronJobRunResponse,
  CronJobRunsResponse,
  JobRun,
  CronJobError,
} from "../../../../shared/types/cronjob"
import type { Socket } from "socket.io-client"

export interface CronjobClientModule {
  requestList: () => void
  requestCreate: (request: CreateCronJobRequest) => void
  requestUpdate: (request: UpdateCronJobRequest) => void
  requestRemove: (jobId: string) => void
  requestRun: (jobId: string) => void
  requestRuns: (jobId: string, limit?: number) => void
  requestToggle: (jobId: string, enabled: boolean) => void

  // Event callbacks
  onListResponse?: (data: CronJobListResponse) => void
  onCreated?: (data: CronJobCreateResponse) => void
  onUpdated?: (data: CronJobUpdateResponse) => void
  onRemoved?: (data: CronJobRemoveResponse) => void
  onRunResponse?: (data: CronJobRunResponse) => void
  onRunsResponse?: (data: CronJobRunsResponse) => void
  onError?: (error: CronJobError) => void
}

export function cronjobClientModule(socket: Socket): CronjobClientModule {
  const module: CronjobClientModule = {
    requestList() {
      socket.emit("cronjob:list", {})
    },

    requestCreate(request: CreateCronJobRequest) {
      socket.emit("cronjob:create", request)
    },

    requestUpdate(request: UpdateCronJobRequest) {
      socket.emit("cronjob:update", request)
    },

    requestRemove(jobId: string) {
      socket.emit("cronjob:remove", { jobId })
    },

    requestRun(jobId: string) {
      socket.emit("cronjob:run", { jobId })
    },

    requestRuns(jobId: string, limit?: number) {
      socket.emit("cronjob:runs", { jobId, limit })
    },

    requestToggle(jobId: string, enabled: boolean) {
      socket.emit("cronjob:toggle", { jobId, enabled })
    },

    // Event callbacks are set externally
    onListResponse: undefined,
    onCreated: undefined,
    onUpdated: undefined,
    onRemoved: undefined,
    onRunResponse: undefined,
    onRunsResponse: undefined,
    onError: undefined,
  }

  // Register event listeners
  socket.on("cronjob:list_response", (data: CronJobListResponse) => {
    module.onListResponse?.(data)
  })

  socket.on("cronjob:created", (data: CronJobCreateResponse) => {
    module.onCreated?.(data)
  })

  socket.on("cronjob:updated", (data: CronJobUpdateResponse) => {
    module.onUpdated?.(data)
  })

  socket.on("cronjob:removed", (data: CronJobRemoveResponse) => {
    module.onRemoved?.(data)
  })

  socket.on("cronjob:run_response", (data: CronJobRunResponse) => {
    module.onRunResponse?.(data)
  })

  socket.on("cronjob:runs_response", (data: CronJobRunsResponse) => {
    module.onRunsResponse?.(data)
  })

  socket.on("cronjob:error", (error: CronJobError) => {
    console.error("[cronjob] error:", error)
    module.onError?.(error)
  })

  return module
}

// Re-export types for convenience
export type { CronJob, CreateCronJobRequest, UpdateCronJobRequest, JobRun }
