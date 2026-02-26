# UI — Screen Layouts (Wi‑Fi → Access Denied)

#### 6.4.3 Wi-Fi Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Wi-Fi"

**Section 1 — Current Connection (full-width Card, only visible when connected):**
- SSID name in `cardTitle` weight
- Key-value rows: IP address, Signal (ProgressBar + percentage), Speed
- `Button` "Disconnect" at bottom-right of card, preset "default"

**Section 2 — Available Networks:**
- `SectionHeader` title "Available Networks", right action: "Scan" button (triggers `wifi:scan` event, shows loading spinner while scanning)
- Flat list of `NetworkListItem` components, each showing:
  - Left: signal strength icon (4 bars, filled proportional to signal %)
  - Center: SSID name
  - Right: lock icon if security is not "Open"
- On tap: opens `BottomSheet` with:
  - Network name as title
  - `TextField` for password (hidden if network is Open)
  - `Button` "Connect" (preset "filled")
  - **Connect flow (ack-only):** On "Connect" tap, call `emitWithAck("wifi:connect", { ssid, password })`. Show inline error from ack error (or from result e.g. `accepted: false` if server uses that). On ack success, do not close the sheet yet — wait for `wifi:status` with `connected: true` and `ssid` matching the selected network, then close sheet and show "Connected" (or navigate back). If ack returns an error, show that message inline and keep sheet open.

**Empty state:** If no networks found after scan, show `EmptyState` "No networks found. Try scanning again."

**Components used:** `Card`, `SectionHeader` (new), `NetworkListItem` (new), `BottomSheet` (new), `ProgressBar`, `TextField`, `Button`, `EmptyState`

#### 6.4.4 Bluetooth Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Bluetooth", right action: power `Switch` toggle (emits bluetooth on/off)

**Section 1 — Connected Devices (visible only when devices are connected):**
- `SectionHeader` title "Connected Devices"
- List of `DeviceListItem`, each showing:
  - Left: type-based icon (headphones for audio, keyboard for input, display for display, question mark for unknown)
  - Center: device name (or MAC if name is null)
  - Right: checkmark icon (paired) + connected status badge
- On tap: shows action sheet with "Disconnect" and "Unpair" options

**Section 2 — Available Devices:**
- `SectionHeader` title "Available Devices", right action: "Scan" button (toggles `bluetooth:scan` / `bluetooth:stop_scan`)
- While scanning: show a subtle pulsing animation on the Scan button
- List of `DeviceListItem`, each showing:
  - Left: type-based icon
  - Center: device name or MAC
  - Right: RSSI value in dBm (e.g., "-42 dBm"), color-coded (strong > -50: green, medium -50 to -70: amber, weak < -70: red)
- On tap: shows `ConfirmDialog` "Pair with {name}?" → on confirm call `emitWithAck("bluetooth:pair", { mac, pin? })`. No `bluetooth:pair_result` event — use ack for immediate error; rely on `bluetooth:status` (device list / paired state) for success. Show inline error from ack if present; on ack success, wait for status update to reflect paired/connected then dismiss.
- If device requires PIN: follow up with a `BottomSheet` containing a `TextField` for PIN input

**Disabled state:** When Bluetooth power is off, show overlay message "Bluetooth is turned off" with the toggle to turn it on.

**Components used:** `DeviceListItem` (new), `SectionHeader`, `Switch` (existing Toggle), `ConfirmDialog`, `BottomSheet`

#### 6.4.5 Audio Screen

**Preset:** `fixed`

**Header:** `Header` with back arrow, title "Audio"

**Section 1 — Volume Control (full-width Card):**
- Card heading: "Volume"
- `VolumeSlider` — large horizontal slider (thumb size 28px, track height 6px)
  - Left end: muted speaker icon
  - Right end: loud speaker icon
  - Below slider: current percentage in `stat` size (e.g., "72%")
  - Dragging emits `audio:set_volume` with debounce (200ms) to avoid flooding
- `Button` "Mute" / "Unmute" below, toggles `audio:toggle_mute`
- When muted: slider track turns gray, percentage shows "Muted" text, mute button changes label

**Section 2 — Output Device (full-width Card):**
- Card heading: "Output Device"
- Radio button list using `Radio` component (existing Toggle/Radio):
  - Each option shows: device type icon + device name (e.g., "HDMI", "3.5mm Jack", "JBL Flip 6 (Bluetooth)")
  - Selected item has filled radio indicator
  - On select: emits `audio:set_output` with device id

**Section 3 — Test Sound (full-width):**
- `Button` preset "filled": "Test Sound"
- On press: emits `audio:test_sound`, button shows brief loading state

**Components used:** `VolumeSlider` (new), `Radio` (existing), `Card`, `Button`

#### 6.4.6 Camera Screen

**Preset:** `fixed`

**Header:** `Header` with back arrow, title "Camera", right action: segmented control for resolution ("480p" | "720p" | "1080p"), default "720p"

**Body — video area:**
- `VideoPlayer` component, takes full width with 16:9 aspect ratio
- When not streaming: shows dark placeholder with camera-off icon centered and text "Camera is off"
- When streaming: shows live WebRTC video feed
- When connecting: shows loading spinner overlay

**Body — action buttons (row layout, gap `md`, below video):**
- `Button` "Snapshot" (preset "default", icon: camera) — emits `camera:snapshot`, disabled when not streaming
- `Button` "Start" / "Stop" (preset "filled" when start, "reversed" when stop) — toggles `camera:start` / `camera:stop`

**Body — status bar (bottom of screen):**
- Single line of `caption` text showing: resolution, FPS, bitrate (e.g., "720p @ 24fps | 2.1 Mbps")
- Only visible when streaming

**WebRTC flow on "Start" press:**
1. Client emits `camera:start` with resolution
2. Server starts libcamera, creates WebRTC offer, emits `camera:offer`
3. Client receives offer, creates answer, emits `camera:answer`
4. ICE candidates exchanged via `camera:ice_candidate` (bidirectional)
5. Stream established, rendered in VideoPlayer

**Components used:** `VideoPlayer` (new), `Button`, `Header`

#### 6.4.7 Storage / SSD Health Screen

**Preset:** `scroll`

**Header:** `Header` with back arrow, title "Storage Health", right action: refresh icon button
(emits `storage:refresh`, shows brief spin animation while fetching).

**Section 1 — Health Overview (full-width Card, prominent):**
- Top row: large colored **health status badge**
  - "Healthy" → `success` green bg (#ECFDF5 dark:#064E3B), green text, checkmark icon
  - "Warning" → `warning` amber bg (#FFFBEB dark:#78350F), amber text, alert-triangle icon
  - "Critical" → `error` red bg (#FEF2F2 dark:#7F1D1D), red text, alert-circle icon
  - Status is derived from `percentageUsed`: <80% = Healthy, 80-95% = Warning, >95% = Critical
- Below badge: drive model name in `cardTitle` weight (e.g., "Samsung 970 EVO Plus 250GB")
- Below model: drive type label in `caption`, `textDim` (e.g., "NVMe SSD")

**Section 2 — Key Metrics (2-column grid, gap `sm`):**
Four `StatCard`-style metric cards, each with colored icon badge:

- **Lifespan Used** — icon: heart-pulse (cyan badge #ECFEFF dark:#164E63, icon #06B6D4)
  - Value: "12%" (from `percentageUsed`), progress bar (cyan → amber >70% → red >90%)
  - Caption: "Estimated lifespan remaining"

- **Temperature** — icon: thermometer (amber badge #FFFBEB dark:#78350F, icon #F59E0B)
  - Value: "38°C" (from `temperature`)
  - Progress bar: green <50°C, amber 50-70°C, red >70°C
  - Caption: "Drive thermal"

- **Total Written** — icon: arrow-down-circle (violet badge #F5F3FF dark:#4C1D95, icon #8B5CF6)
  - Value: "2.4 TB" (calculated from `dataUnitsWritten × 512000 / 1e12`)
  - Caption: "Lifetime writes"

- **Power On** — icon: clock (blue badge #EFF6FF dark:#1E3A5F, icon #3B82F6)
  - Value: "1,247 hrs" (from `powerOnHours`, formatted with comma separator)
  - Caption: "Total runtime"

**Section 3 — Drive Details (full-width Card):**
Key-value list with `sm` gap between rows:
- **Device:** `/dev/nvme0n1` — `textDim` key, `text` value
- **Serial:** `S4EWNX0M...` — truncated with "..." if long, tap to copy full serial
- **Firmware:** `2B2QEXM7`
- **Interface:** `NVMe`
- **Capacity:** `232.9 GB` (formatted from `size`)
- **Used Space:** `89.2 / 232.9 GB` (from disk usage, with small progress bar inline)

Each row has a thin `border` separator line between items. Keys are `textDim`, values are `text`.

**Section 4 — S.M.A.R.T. Details (full-width Card, collapsible):**
- Card heading: "S.M.A.R.T. Data" with chevron toggle (collapsed by default)
- When expanded: key-value list of NVMe smart-log attributes:
  - Each row: attribute name (left, `body` weight) + raw value (right, monospace font)
  - Rows with abnormal values highlighted with `warning` or `error` left border (4px):
    - `mediaErrors > 0` → `error`
    - `unsafeShutdowns > 10` → `warning`
    - `availableSpare < availableSpareThreshold` → `error`
    - `criticalWarning > 0` → `error`
  - Attributes shown: Available Spare, Available Spare Threshold, Media Errors,
    Unsafe Shutdowns, Error Log Entries, Critical Warning, Data Units Read, Data Units Written

**Section 5 — Disk Partitions (full-width Card):**
- Card heading: "Partitions"
- List of mounted partitions, each row:
  - Left: folder icon in slate badge (36x36)
  - Center: mount point (`/`, `/boot`, `/media/usb0`) in `body` weight, filesystem type below in `caption`
  - Right: usage bar (thin, 80px wide) + "89.2 GB / 232.9 GB" in `caption`
  - Usage bar color: cyan, shifts to amber >70%, red >90%

**Loading state:** Skeleton loaders matching each section shape. Health badge → rounded rect,
stat cards → 2x2 skeleton grid, details → key-value skeleton rows.

**Components used:** `StatCard`, `ProgressBar`, `Card`, `SectionHeader`, `Header`, `IconBadge`

#### 6.4.8 Settings Screen

**Preset:** `scroll`

**Header:** Standard tab header, title "Settings"

**Section 1 — Appearance (Card):**
- Row: "Theme" label + dropdown/picker (options: "System", "Light", "Dark"), uses existing `setThemeContextOverride`
- Row: "Language" label + dropdown/picker (options: based on available i18n locales)

**Section 2 — Connection (Card):**
- Row: "Server URL" label + value (from env config)
- Row: "Status" label + `ConnectionBadge`
- Row: "Latency" label + value in ms (measured from socket ping/pong)

**Section 3 — About (Card):**
- Row: "App Version" + value from app config
- Row: "Server Version" + value received via socket on connect
- Row: "Telegram ID" + value from auth context (username or ID)

**Components used:** `Card`, `ConnectionBadge`, existing theme/i18n utilities

#### 6.4.9 Access Denied Screen

**When shown:** After `connect_error` with message `"ACCESS_DENIED"` (user not in whitelist).

**Layout:**
- Centered vertically on screen
- Lock icon (large, `error` color)
- Title: "Access Denied" in `screenTitle` weight
- Body text: "Your Telegram account is not authorized to use this app. Contact the device owner to request access." in `body` weight, `textDim` color
- Below: show the user's Telegram ID in `caption` for reference (so they can share it with the admin)
- `Button` "Try Again" (preset "default") → re-attempts socket connection with same initData

**No navigation:** This screen replaces the entire app. No tabs, no header, no back button.

