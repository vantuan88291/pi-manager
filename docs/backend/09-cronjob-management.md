# Cronjob Management — Backend Spec

> **Status:** Draft (Phase 5 — OpenClaw Integration)  
> **Integration:** OpenClaw Gateway cron API

---

## Overview

Allow users to create, manage, and monitor OpenClaw cron jobs directly from the Pi Manager Telegram Mini App.

**Use Cases:**
- Schedule periodic health checks
- Run backup scripts
- Execute maintenance tasks
- Monitor system metrics over time

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Pi Manager UI  │─────►│  Pi Manager BE  │─────►│  OpenClaw GW    │
│  (React Native) │ WS   │  (Node.js)      │ HTTP │  (cron API)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

**Flow:**
1. Frontend sends cron job request via Socket.IO
2. Backend forwards to OpenClaw Gateway via HTTP (with auth token)
3. Gateway stores job in cron scheduler
4. Backend emits job status update via WebSocket

---

## Socket Module Spec

### Module Name: `cronjob`

### Events (Client → Server)

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `cronjob:list` | `{}` | `CronJob[]` | List all cron jobs |
| `cronjob:create` | `CreateCronJobRequest` | `CronJob` | Create new job |
| `cronjob:update` | `{ jobId: string, patch: object }` | `CronJob` | Update existing job |
| `cronjob:remove` | `{ jobId: string }` | `{ success: boolean }` | Delete job |
| `cronjob:run` | `{ jobId: string }` | `{ success: boolean }` | Trigger job immediately |
| `cronjob:runs` | `{ jobId: string, limit?: number }` | `JobRun[]` | Get run history |

### Events (Server → Client)

| Event | Payload | Trigger |
|-------|---------|---------|
| `cronjob:list_response` | `{ jobs: CronJob[] }` | After `cronjob:list` |
| `cronjob:created` | `{ job: CronJob }` | After successful create |
| `cronjob:updated` | `{ job: CronJob }` | After successful update |
| `cronjob:removed` | `{ jobId: string }` | After successful delete |
| `cronjob:run_response` | `{ success: boolean, runId?: string }` | After manual run |
| `cronjob:runs_response` | `{ runs: JobRun[] }` | After history request |
| `cronjob:error` | `{ code: string, message: string }` | On any error |

---

## Data Types

### CronJob

```typescript
interface CronJob {
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
```

### Schedule

```typescript
type Schedule = 
  | { kind: "at"; at: string }              // ISO-8601 timestamp
  | { kind: "every"; everyMs: number; anchorMs?: number }  // Recurring interval
  | { kind: "cron"; expr: string; tz?: string }  // Cron expression
```

### CronPayload

```typescript
type CronPayload =
  | { kind: "systemEvent"; text: string }   // Inject system event
  | { kind: "agentTurn"; message: string; model?: string; timeoutSeconds?: number }  // Run agent
```

### Delivery

```typescript
interface Delivery {
  mode: "none" | "announce" | "webhook"
  channel?: string      // For announce: target channel
  to?: string           // For webhook: URL
  bestEffort?: boolean  // Don't fail if delivery fails
}
```

### JobRun

```typescript
interface JobRun {
  runId: string
  jobId: string
  startedAt: number
  finishedAt?: number
  status: "running" | "success" | "failed" | "timeout"
  result?: any
  error?: string
}
```

---

## Request/Response Examples

### Create Cron Job

**Request:**
```typescript
{
  "name": "Daily Health Check",
  "schedule": {
    "kind": "cron",
    "expr": "0 8 * * *",  // Every day at 8 AM
    "tz": "Asia/Saigon"
  },
  "payload": {
    "kind": "systemEvent",
    "text": "🔍 Running daily health check..."
  },
  "delivery": {
    "mode": "announce"
  },
  "sessionTarget": "isolated"
}
```

**Response:**
```typescript
{
  "jobId": "abc123",
  "name": "Daily Health Check",
  "enabled": true,
  "schedule": { "kind": "cron", "expr": "0 8 * * *", "tz": "Asia/Saigon" },
  "payload": { "kind": "systemEvent", "text": "🔍 Running daily health check..." },
  "sessionTarget": "isolated",
  "createdAt": 1234567890000,
  "nextRunAt": 1234654200000
}
```

### List Cron Jobs

**Request:**
```typescript
{}
```

**Response:**
```typescript
{
  "jobs": [
    {
      "jobId": "abc123",
      "name": "Daily Health Check",
      "enabled": true,
      "schedule": { "kind": "cron", "expr": "0 8 * * *" },
      "nextRunAt": 1234654200000
    }
  ]
}
```

---

## OpenClaw Gateway Integration

### Prerequisites

1. **Gateway Token:** Stored in server `.env`
   ```bash
   OPENCLAW_GATEWAY_URL=http://localhost:8080
   OPENCLAW_GATEWAY_TOKEN=your-gateway-token
   ```

2. **Auth Header:** All cron API calls include:
   ```
   Authorization: Bearer <OPENCLAW_GATEWAY_TOKEN>
   ```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cron/status` | Check cron scheduler status |
| `GET` | `/cron/list?includeDisabled=true` | List all jobs |
| `POST` | `/cron/add` | Create new job |
| `PATCH` | `/cron/update/:jobId` | Update job |
| `DELETE` | `/cron/remove/:jobId` | Delete job |
| `POST` | `/cron/run/:jobId` | Trigger job |
| `GET` | `/cron/runs/:jobId` | Get run history |

### Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Return data |
| 401 | Unauthorized | Check gateway token |
| 404 | Job not found | Invalid jobId |
| 400 | Bad request | Invalid schedule/payload |
| 500 | Server error | Gateway internal error |

---

## Implementation Checklist

### Phase 1: Backend Foundation

- [ ] Create `server/src/socket/modules/cronjob.ts`
- [ ] Implement Socket.IO event handlers
- [ ] Add OpenClaw Gateway HTTP client
- [ ] Add env vars: `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN`
- [ ] Add error handling + retry logic

### Phase 2: Shared Types

- [ ] Add `shared/types/cronjob.ts`
- [ ] Define `CronJob`, `Schedule`, `CronPayload`, `Delivery`, `JobRun`
- [ ] Export in `shared/types/index.ts`

### Phase 3: Frontend Client

- [ ] Create `app/services/socket/modules/cronjob.ts`
- [ ] Implement client module with typed methods
- [ ] Add to `SocketManager` registration

### Phase 4: UI Screen

- [ ] Create `app/screens/CronJobScreen.tsx`
- [ ] Add to Control menu
- [ ] Implement job list view
- [ ] Implement create/edit modal
- [ ] Add run history view

---

## Security Considerations

1. **Auth Required:** Only authenticated Telegram users can manage cron jobs
2. **Whitelist:** Only users in `whitelist.json` can create/modify jobs
3. **Rate Limiting:** Max 10 jobs per user, max 1 run/minute manually
4. **Validation:** Validate cron expressions, payload schemas
5. **Audit Log:** Log all cron job operations

---

## Testing

### Manual Test Flow

1. Open Pi Manager in Telegram
2. Go to Control → Cron Jobs
3. Create new job:
   - Name: "Test Job"
   - Schedule: Every 5 minutes
   - Payload: System event "Test"
4. Verify job appears in list
5. Manually trigger job
6. Check run history shows success
7. Edit job (change schedule)
8. Delete job

### Automated Tests

- [ ] Unit tests for cron module
- [ ] Integration tests with mock Gateway
- [ ] E2E test: create → run → delete

---

## Future Enhancements

- **Templates:** Pre-defined job templates (health check, backup, etc.)
- **Notifications:** Push notification when job fails
- **Metrics:** Dashboard showing job success rate, avg runtime
- **Pause/Resume:** Toggle job enabled state without deleting
- **Bulk Operations:** Enable/disable/delete multiple jobs

---

*Last updated: 2026-03-07*
