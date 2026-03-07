# Cronjob Screen — UI Spec

> **Status:** Draft (Phase 5 — OpenClaw Integration)  
> **Route:** `Control → Cron Jobs`

---

## Overview

Screen for managing scheduled tasks directly from Pi Manager Telegram Mini App.

**User Stories:**
- As a user, I want to see all scheduled cron jobs
- As a user, I want to create a new scheduled task
- As a user, I want to enable/disable jobs
- As a user, I want to manually trigger a job
- As a user, I want to see job execution history

---

## Task Types

### 1. 🖥️ Shell Command

**Description:** Execute bash commands directly on the Raspberry Pi.

**Use Cases:**
- System control (shutdown, reboot)
- Run scripts (backup, health check)
- Service management (restart nginx, docker)
- File operations (rsync, tar, cleanup)

**Example Commands:**
```bash
sudo shutdown -h now
sudo reboot
rsync -av /data /backup
python3 /scripts/health_check.py
sudo systemctl restart nginx
```

**Security:**
- Commands are validated against whitelist
- Requires sudo configuration
- Only authorized users can create shell tasks
- Timeout protection (max execution time)

**UI Description Box:**
```
┌─────────────────────────────────────────┐
│ ℹ️ Shell Command                        │
│                                         │
│ Run bash commands directly on your      │
│ Raspberry Pi. Use for system control,   │
│ scripts, and automation tasks.          │
│                                         │
│ ⚠️ Requires proper sudo configuration   │
│ ⚠️ Commands are validated for safety    │
└─────────────────────────────────────────┘
```

---

### 2. 🤖 Agent Task

**Description:** Run AI agent with custom prompt to perform intelligent tasks.

**Use Cases:**
- System analysis and reporting
- Intelligent decision making
- Natural language queries
- Automated troubleshooting

**Example Prompts:**
```
"Check system status (CPU, RAM, disk, network) and create a summary report"

"Analyze logs from the past 24 hours and identify any issues"

"Check if backups completed successfully and notify me"

"Review system security and suggest improvements"
```

**Features:**
- Choose AI model (qwen-coder, gpt-4, etc.)
- Set timeout for execution
- Receive AI-generated response
- Can chain with other tasks

**UI Description Box:**
```
┌─────────────────────────────────────────┐
│ ℹ️ Agent Task                           │
│                                         │
│ AI agent will execute your prompt to    │
│ perform intelligent tasks like analysis,│
│ reporting, and decision making.         │
│                                         │
│ 💡 Be specific in your instructions     │
│ ⏱️ Set appropriate timeout (30-300s)    │
│ 🤖 Model: qwen-coder (default)          │
└─────────────────────────────────────────┘
```

---

### 3. 💬 System Event

**Description:** Send notification message to OpenClaw session.

**Use Cases:**
- Scheduled reminders
- Status notifications
- Maintenance alerts
- Simple announcements

**Example Messages:**
```
🔍 Running daily health check...
⚠️ System maintenance in 5 minutes
💾 Backup completed successfully
📊 Weekly report is ready
```

**Features:**
- Simple message text
- No execution time
- Instant delivery
- Can include emojis

**UI Description Box:**
```
┌─────────────────────────────────────────┐
│ ℹ️ System Event                         │
│                                         │
│ Send a notification message to your     │
│ OpenClaw session. Use for reminders,    │
│ alerts, and simple announcements.       │
│                                         │
│ 💬 Supports emojis and formatting       │
│ ⚡ Instant delivery (no execution time) │
│ 🔔 Delivers to configured channel       │
└─────────────────────────────────────────┘
```

---

## Navigation

**Entry Point:** Control Menu → "Cron Jobs" card

**Tab:** Control (bottom tab)

**Stack:**
```
MainTabs (Control)
  └─ ControlMenuScreen
      └─ CronJobScreen (push)
```

---

## Screen Layout

```
┌─────────────────────────────────────┐
│ ← Cron Jobs                         │ Header
├─────────────────────────────────────┤
│ [+ Create Job]                      │ Action Button
├─────────────────────────────────────┤
│ 🔵 Active Jobs (3)                  │ Section Header
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ⏰ Daily Health Check           │ │ Job Card
│ │ 🕐 Every day at 8:00 AM         │ │
│ │ ✅ Enabled  •  🟢 Next: 2h     │ │
│ │ [Run] [Edit] [Disable]          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Weekly Backup                │ │ Job Card
│ │ 🕐 Every Monday at 2:00 AM      │ │
│ │ ✅ Enabled  •  🟢 Next: 3d      │ │
│ │ [Run] [Edit] [Disable]          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ⚪ Disabled Jobs (1)                │ Section Header
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 📊 Monthly Report               │ │ Job Card (dimmed)
│ │ 🕐 First of month at 9:00 AM    │ │
│ │ ❌ Disabled                     │ │
│ │ [Enable] [Edit] [Delete]        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Components

### 1. CronJobCard

**Props:**
```typescript
interface CronJobCardProps {
  job: CronJob
  onRun: (jobId: string) => void
  onEdit: (job: CronJob) => void
  onToggle: (jobId: string, enabled: boolean) => void
  onDelete: (jobId: string) => void
}
```

**Layout:**
- **Icon:** Based on job type (system event = 🔔, agent turn = 🤖)
- **Title:** Job name (truncate if > 30 chars)
- **Schedule:** Human-readable schedule
- **Status:** Enabled/Disabled badge + next run time
- **Actions:** Contextual buttons (Run/Edit/Disable or Enable/Delete)

**States:**
- **Active:** Full opacity, green status dot
- **Disabled:** 50% opacity, gray status dot
- **Running:** Show spinner on Run button

---

### 2. Create/Edit Modal (BottomSheet)

**Design Guidelines:**
- **Style:** Follow existing theme (colors, spacing, typography from `theme/`)
- **Layout:** Full-width bottom sheet with scrollable content
- **Header:** Title + Close button (X)
- **Footer:** Cancel + Save button (sticky)
- **Sections:** Grouped with section headers and spacing

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ ✨ Create Scheduled Task           [X]  │ ← Header (bold, centered)
├─────────────────────────────────────────┤
│                                         │
│ Task Name                               │ ← Section label (medium, text color)
│ ┌───────────────────────────────────┐  │
│ │ Daily Shutdown                    │  │ ← TextField (surface bg, border)
│ └───────────────────────────────────┘  │
│                                         │
│ Task Type                               │
│ ┌───────────────────────────────────┐  │
│ │ 🖥️ Shell Command            [▼]  │  │ ← Picker Card (selectable)
│ └───────────────────────────────────┘  │
│                                         │
│ ┌───────────────────────────────────┐  │ ← Info Box (subtle bg, icon)
│ │ ℹ️ Shell Command                  │  │
│ │                                   │  │
│ │ Run bash commands directly on     │  │
│ │ your Raspberry Pi. Use for system │  │
│ │ control, scripts, and automation. │  │
│ │                                   │  │
│ │ ⚠️ Requires sudo configuration    │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ─────────────────────────────────────  │ ← Divider (border color)
│                                         │
│ Command                                 │
│ ┌───────────────────────────────────┐  │
│ │ sudo shutdown -h now              │  │ ← Monospace font for commands
│ └───────────────────────────────────┘  │
│                                         │
│ Working Directory (optional)            │
│ ┌───────────────────────────────────┐  │
│ │ /home/vantuan88291/scripts        │  │
│ └───────────────────────────────────┘  │
│                                         │
│ Timeout                                 │
│ ┌──────────────┐ ┌──────────────────┐  │
│ │ 60       [▼] │ │ seconds      [▼] │  │ ← Inline pickers
│ └──────────────┘ └──────────────────┘  │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ ⏰ When to Run                          │ ← Section header with icon
│                                         │
│ [Daily] [Weekly] [Monthly] [Interval]  │ ← Segmented Control (primary color)
│                                         │
│ ┌───────────────────────────────────┐  │
│ │        🕐 10:00 PM                │  │ ← Time Picker (large, centered)
│ └───────────────────────────────────┘  │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ 🔔 Notifications                        │
│ ☑️ Notify on completion                 │ ← Checkbox (accent color)
│ ☑️ Notify on failure                    │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│      [Cancel]        [Create Task]     │ ← Footer (sticky, primary button)
│                                         │
└─────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text | No | "Untitled Job" | Max 50 chars |
| Task Type | Picker | Yes | "shell" | Shell/Agent/Event with description |
| Command | Text | Conditional | "" | Shell command (monospace font) |
| Prompt | Text Area | Conditional | "" | Agent instructions (max 500 chars) |
| Message | Text Area | Conditional | "" | System event text (max 200 chars) |
| Working Dir | Text | Conditional | "" | For shell commands |
| Timeout | Number + Unit | Conditional | 60s | Max 3600s |
| Schedule Type | Segmented | Yes | "daily" | Daily/Weekly/Monthly/Interval/Custom |
| Time | Time Picker | Conditional | 08:00 | For daily/weekly/monthly |
| Day | Day Picker | Conditional | Mon | For weekly |
| Day of Month | Number | Conditional | 1 | For monthly (1-31) |
| Interval Value | Number | Conditional | 1 | For interval type |
| Interval Unit | Picker | Conditional | hours | minutes/hours/days |
| Start Date | DateTime | Conditional | Now | For interval type |
| Cron Expression | Text | Conditional | "* * * * *" | For custom type |
| Timezone | Picker | No | "Asia/Saigon" | Common timezones |
| Model | Text | Conditional | "auto" | For agent tasks |
| Session Target | Picker | Yes | "isolated" | isolated/main |
| Delivery Mode | Picker | No | "announce" | none/announce/webhook |
| Notify Success | Checkbox | No | true | For shell commands |
| Notify Failure | Checkbox | No | true | For shell commands |

**Validation:**
- Cron expression must be valid (5-6 parts)
- Interval must be > 0
- DateTime must be in future
- Message/text required

**Actions:**
- **Cancel:** Close modal without saving
- **Save:** Create/Update job, show success toast

---

### 3. Run History Modal

**Trigger:** Tap job card → History button

**Content:**
```
┌─────────────────────────────────────┐
│ Run History                    [X]  │ Header
├─────────────────────────────────────┤
│ 🟢 Success                          │
│ ├─ Started: 2026-03-07 08:00:00    │
│ ├─ Duration: 1.2s                  │
│ └─ Result: "Job completed"         │
├─────────────────────────────────────┤
│ 🔴 Failed                           │
│ ├─ Started: 2026-03-06 08:00:00    │
│ ├─ Duration: 0.3s                  │
│ └─ Error: "Timeout"                │
├─────────────────────────────────────┤
│ 🟢 Success                          │
│ ├─ Started: 2026-03-05 08:00:00    │
│ └─ Duration: 1.1s                  │
└─────────────────────────────────────┘
```

**Run Card Props:**
- **Status Icon:** 🟢 success, 🔴 failed, 🟡 running, ⚫ timeout
- **Started At:** Formatted datetime
- **Duration:** Human-readable (e.g., "1.2s", "5m 30s")
- **Result/Error:** First 100 chars, expandable

---

## Screen States

### 1. Loading

```
┌─────────────────────────────────────┐
│ ← Cron Jobs                         │
├─────────────────────────────────────┤
│                                   │
│         ⏳ Loading jobs...         │
│                                   │
└─────────────────────────────────────┘
```

### 2. Empty State (No Jobs)

```
┌─────────────────────────────────────┐
│ ← Cron Jobs                         │
├─────────────────────────────────────┤
│                                   │
│        📭 No cron jobs yet         │
│                                   │
│    Create your first scheduled     │
│          task to get started        │
│                                   │
│      [+ Create Job]                │
│                                   │
└─────────────────────────────────────┘
```

### 3. Error State

```
┌─────────────────────────────────────┐
│ ← Cron Jobs                         │
├─────────────────────────────────────┤
│                                   │
│        ❌ Failed to load           │
│                                   │
│    Unable to connect to server     │
│                                   │
│      [Retry]                       │
│                                   │
└─────────────────────────────────────┘
```

### 4. Success (Jobs List)

Shows active jobs section + disabled jobs section (if any)

---

## Interactions

### Create Job Flow

1. Tap "Create Job" button
2. Bottom sheet slides up
3. Fill in job details
4. Tap "Save"
5. Validate fields
6. Show loading spinner
7. On success: Close modal, show toast "Job created", refresh list
8. On error: Show error message in modal

### Edit Job Flow

1. Tap "Edit" on job card
2. Bottom sheet slides up with pre-filled values
3. Modify fields
4. Tap "Save"
5. On success: Close modal, show toast "Job updated", refresh list

### Run Job Flow

1. Tap "Run" on job card
2. Show confirmation dialog: "Run job now?"
3. On confirm: Show loading spinner on button
4. On success: Show toast "Job triggered", update lastRunAt
5. On error: Show error toast

### Toggle Enable/Disable

1. Tap "Disable" or "Enable" on job card
2. Optimistic UI update (immediate toggle)
3. Send request to server
4. On error: Revert toggle, show error toast

### Delete Job Flow

1. Tap "Delete" on job card
2. Show confirmation dialog: "Delete this job? This cannot be undone."
3. On confirm: Show loading
4. On success: Remove card from list, show toast "Job deleted"
5. On error: Show error toast

---

## Styling

### Theme Integration

**Use existing theme tokens from `app/theme/`:**

```typescript
const { themed, theme } = useAppTheme()

// Colors
theme.colors.surface      // Card background
theme.colors.border       // Borders and dividers
theme.colors.text         // Primary text
theme.colors.textDim      // Secondary text
theme.colors.tint         // Primary accent (buttons, active states)
theme.colors.success      // Success states
theme.colors.error        // Error states
theme.colors.warning      // Warning states

// Spacing
theme.spacing.sm   // 8px
theme.spacing.md   // 12px
theme.spacing.lg   // 16px
theme.spacing.xl   // 24px
```

### Colors

| Element | Light Mode | Dark Mode | Theme Token |
|---------|-----------|-----------|-------------|
| Card BG | `#FFFFFF` | `#1C1C1E` | `colors.surface` |
| Border | `#E5E5EA` | `#38383A` | `colors.border` |
| Primary Text | `#1C1C1E` | `#FFFFFF` | `colors.text` |
| Secondary Text | `#6B7280` | `#9CA3AF` | `colors.textDim` |
| Primary Button | `#6366F1` | `#818CF8` | `colors.tint` |
| Active Badge | `#EEF2FF` | `#312E81` | `colors.tint` + 20% opacity |
| Disabled Badge | `#F3F4F6` | `#4B5563` | `colors.palette.neutral300` |
| Success Dot | `#10B981` | `#34D399` | `colors.success` |
| Error Dot | `#EF4444` | `#F87171` | `colors.error` |
| Warning Dot | `#F59E0B` | `#FBBF24` | `colors.warning` |
| Info Box BG | `#F0F9FF` | `#1E3A5F` | `colors.info` + 20% |

### Info Box Styles

```typescript
const $infoBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.info + '20',  // 20% opacity
  borderRadius: spacing.lg,
  padding: spacing.md,
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
})

const $infoBoxIcon: ViewStyle = {
  fontSize: 20,
  marginTop: 2,
}

const $infoBoxText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  flex: 1,
  lineHeight: 20,
})

const $infoBoxWarning: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.warning + '20',
  borderRadius: spacing.lg,
  padding: spacing.md,
  marginTop: spacing.sm,
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
})
```

### Spacing

| Element | Value | Theme Token |
|---------|-------|-------------|
| Card padding | 16px | `spacing.lg` |
| Section margin top | 24px | `spacing.xl` |
| Button gap | 8px | `spacing.sm` |
| Input height | 48px | - |
| Modal padding | 20px | - |
| Divider margin | 24px vertical | `spacing.xl` |
| Info box margin | 12px top/bottom | `spacing.md` |

### Typography

| Element | Size | Weight | Color | Theme |
|---------|------|--------|-------|-------|
| Header title | 17px | SemiBold | text | `size="md" weight="semiBold"` |
| Section header | 15px | SemiBold | text | `size="sm" weight="semiBold"` |
| Job name | 14px | SemiBold | text | `size="sm" weight="semiBold"` |
| Schedule | 12px | Regular | textDim | `size="xs" color="textDim"` |
| Status | 12px | Medium | text | `size="xs" weight="medium"` |
| Button | 15px | SemiBold | - | `size="sm" weight="semiBold"` |
| Input text | 15px | Regular | text | `size="sm"` |
| Info box | 13px | Regular | text | `size="xs"` |

### Component Styles

#### Task Type Picker Card

```typescript
const $taskTypeCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const $taskTypeCardSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + '10',  // 10% opacity
})
```

#### Segmented Control

```typescript
const $segmentedControl: ViewStyle = {
  height: 36,
  borderRadius: 8,
  backgroundColor: '#E5E7EB',  // Neutral gray
  padding: 4,
}

const $segmentSelected: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
}
```

#### Info Box

```typescript
const $infoBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.info + '15',
  borderRadius: spacing.lg,
  padding: spacing.md,
  marginVertical: spacing.md,
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.sm,
})
```

#### Footer Buttons

```typescript
const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  gap: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
})

const $cancelButton: ViewStyle = {
  flex: 1,
  height: 48,
  borderWidth: 1,
}

const $saveButton: ViewStyle = {
  flex: 2,
  height: 48,
}
```

---

## Socket Integration

### Subscribe on Mount

```typescript
useEffect(() => {
  subscribeToModule("cronjob")
  cronjobClientModule.requestList()
  
  return () => {
    unsubscribeFromModule("cronjob")
  }
}, [])
```

### Event Handlers

```typescript
const handleJobList = (jobs: CronJob[]) => {
  setJobs(jobs)
  setLoading(false)
}

const handleJobCreated = (job: CronJob) => {
  setJobs(prev => [...prev, job])
  showToast("Job created")
}

const handleJobUpdated = (job: CronJob) => {
  setJobs(prev => prev.map(j => j.jobId === job.jobId ? job : j))
  showToast("Job updated")
}

const handleJobRemoved = (jobId: string) => {
  setJobs(prev => prev.filter(j => j.jobId !== jobId))
  showToast("Job deleted")
}
```

---

## Validation Rules

### Cron Expression

- Must have 5-6 space-separated parts
- Parts: minute, hour, day, month, weekday [, year]
- Allowed chars: `0-9`, `*`, `-`, `,`, `/`
- Example: `0 8 * * *` (every day at 8 AM)

### Interval

- Must be number > 0
- Max: 8760 (1 year in hours)
- Step: 0.5 (30 minutes)

### DateTime

- Must be future date
- Min: current time + 1 minute
- Format: ISO-8601

### Name

- Max length: 50 chars
- Allowed: alphanumeric, spaces, basic punctuation

---

## Error Messages

| Error | User Message |
|-------|-------------|
| `INVALID_CRON` | "Invalid cron expression. Example: `0 8 * * *`" |
| `INVALID_INTERVAL` | "Interval must be greater than 0" |
| `PAST_DATETIME` | "Date/time must be in the future" |
| `NAME_TOO_LONG` | "Name must be 50 characters or less" |
| `GATEWAY_ERROR` | "Unable to connect to OpenClaw Gateway" |
| `UNAUTHORIZED` | "Not authorized to manage cron jobs" |
| `NOT_FOUND` | "Job not found" |
| `RATE_LIMITED` | "Too many requests. Please wait a moment." |

---

## Accessibility

- **Labels:** All buttons have accessible labels
- **Contrast:** Text meets WCAG AA standards
- **Focus:** Modal traps focus, ESC closes
- **Screen Reader:** Announce job status changes

---

## Performance

- **Virtual Scroll:** For lists with 50+ jobs
- **Debounce:** Search/filter input (300ms)
- **Optimistic Updates:** Toggle enable/disable immediately
- **Cache:** Store jobs in memory, refresh on focus

---

## Testing Checklist

- [ ] Create job with cron schedule
- [ ] Create job with interval schedule
- [ ] Create job with one-time schedule
- [ ] Edit existing job
- [ ] Delete job (with confirmation)
- [ ] Toggle enable/disable
- [ ] Manually run job
- [ ] View run history
- [ ] Handle empty state
- [ ] Handle error state
- [ ] Handle loading state
- [ ] Validate cron expression
- [ ] Validate interval
- [ ] Validate datetime
- [ ] Test with 100+ jobs (performance)

---

*Last updated: 2026-03-07*
