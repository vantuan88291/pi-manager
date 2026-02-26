# Pi Manager — UI Specification

> Part of Pi Manager spec. See also:
> - [OVERVIEW.md](./OVERVIEW.md) — architecture, types, roadmap
> - [BACKEND.md](./BACKEND.md) — socket, server, deployment

---

**Navigation (as-is vs planned):** The current codebase has `AppStackParamList` with `Welcome` and `Login` only. The screens and navigation described below (TelegramAuthScreen, MainTabs with Dashboard / Control / Settings, feature screens) are **planned** — implement in Phase 1 and later. Do not assume they exist in the repo today.

---

## 6. UI Design Specification

### 6.1 Design Principles

- **Dark-first**: The app targets a Pi terminal/IoT audience. Dark theme is default, light optional.
- **Colorful & vibrant**: Every feature has its own accent color. Cards, icons, and progress bars use color to communicate meaning — not just black/white/gray.
- **Card-based layout**: Every feature section is a Card with rounded corners (borderRadius `md` = 16), subtle shadows, and tinted icon badges.
- **Generous spacing**: Items in lists and grids always have visible gaps. No elements touching or feeling cramped. Minimum gap between cards/items = `sm` (12px), preferred = `md` (16px).
- **Minimal chrome**: No heavy headers. Thin tab bar at the bottom. Content fills the screen.
- **Status colors**: green = healthy/connected, amber = warning/loading, red = error/disconnected. These colors appear frequently — on badges, progress bars, icons, and text.
- **Responsive**: Works in 375px (Telegram Mini App) up to 768px (tablet/desktop browser).
- **Smooth transitions**: Use `react-native-reanimated` for layout animations, skeleton loaders while data loads.
- **All-or-nothing access**: If you're in the whitelist, you have full access. No role tiers.

### 6.2 Color Palette (extended for Pi Manager)

**IMPORTANT:** The Ignite default palette (warm neutrals, brown tints) MUST be replaced with
this modern IoT palette. Update both `app/theme/colors.ts` and `app/theme/colorsDark.ts`.
Do NOT keep the default Ignite browns/beiges — they make the app look dull and monotone.

```
Semantic Token        Light Mode          Dark Mode           Usage
────────────────────  ──────────────────  ──────────────────  ─────────────────────────
background            #F0F2F5             #0F172A             Screen backgrounds (cool gray, not warm beige)
surface               #FFFFFF             #1E293B             Card backgrounds
surfaceElevated       #FFFFFF             #334155             Elevated cards, modals, bottom sheets
text                  #1E293B             #F1F5F9             Primary text
textDim               #64748B             #94A3B8             Secondary text, labels, captions
border                #E2E8F0             #334155             Card borders, dividers (subtle, not heavy)
tint                  #6366F1             #818CF8             Primary action color (indigo)
tintDim               #A5B4FC             #6366F180           Inactive/disabled tint
success               #10B981             #34D399             Connected, healthy, good values
warning               #F59E0B             #FBBF24             Loading, caution, moderate values
error                 #EF4444             #F87171             Disconnected, errors, critical values
info                  #3B82F6             #60A5FA             Informational badges, links
```

**Feature accent colors** — each feature has a unique tint used for its icon badge and highlights:

```
Feature       Accent Color        Icon Badge BG (light)     Icon Badge BG (dark)
────────────  ──────────────────  ────────────────────────  ──────────────────────
CPU / System  #6366F1 (indigo)    #EEF2FF                   #312E81
Temperature   #F59E0B (amber)     #FFFBEB                   #78350F
Memory        #8B5CF6 (violet)    #F5F3FF                   #4C1D95
Disk          #06B6D4 (cyan)      #ECFEFF                   #164E63
Wi-Fi         #3B82F6 (blue)      #EFF6FF                   #1E3A5F
Bluetooth     #6366F1 (indigo)    #EEF2FF                   #312E81
Audio         #EC4899 (pink)      #FDF2F8                   #831843
Camera        #10B981 (emerald)   #ECFDF5                   #064E3B
Storage/SSD   #06B6D4 (cyan)      #ECFEFF                   #164E63
Settings      #64748B (slate)     #F1F5F9                   #334155
```

#### Phase 0 — Theme Foundation (checklist, do before any UI work)

- [ ] Redesign `app/theme/colors.ts` (light) — replace Ignite palette with table above; add semantic tokens: `surface`, `surfaceElevated`, `success`, `warning`, `info`, `tintDim`.
- [ ] Redesign `app/theme/colorsDark.ts` (dark) — same shape, dark values from table.
- [ ] Add `app/theme/featureColors.ts` — export `featureColors` object (keys: cpu, temperature, memory, disk, wifi, bluetooth, audio, camera, storage, settings, system) with `{ accent, badgeLight, badgeDark }` per key (use table above). Export type `FeatureKey = keyof typeof featureColors`.
- [ ] Verify both color files export the same shape (`Colors = typeof colorsLight | typeof colorsDark`).

**Copy-paste:** If you need exact hex values for `colors.ts` / `colorsDark.ts`, use the semantic token table in 6.2 and the feature accent table above. Full palette objects (neutral100–neutral900, primary100–primary600, etc.) can be derived from the same tokens or kept minimal (only the exported `colors` object with semantic keys).

### 6.3 Typography Scale

Use the existing Space Grotesk font. Add semantic size aliases:

```
Name          Size    Weight        Usage
────────────  ──────  ────────────  ──────────────────────────────
screenTitle   24px    Bold          Screen titles (Dashboard, Wi-Fi...)
sectionTitle  18px    SemiBold      Section headings inside screens
cardTitle     16px    SemiBold      Card headings
body          14px    Regular       General text, descriptions
caption       12px    Regular       Timestamps, secondary info
stat          32px    Bold          Large stat numbers (CPU 45%)
statUnit      14px    Medium        Units next to stats (%, °C, MB)
```

### 6.8 Styling Rules (mandatory for all screens)

> AI must follow these rules when building any screen. These rules prevent the "flat monotone"
> look and ensure a professional, visually rich UI.

#### 6.8.1 Spacing & Gaps

- **Screen padding:** `md` (16px) on all sides.
- **Section gap:** `lg` (24px) vertical gap between sections (e.g., between stats grid and network card).
- **Grid gap:** `sm` (12px) both horizontal and vertical between grid items. Use `gap` property on the container, NOT `marginBottom` alone on children. If `gap` is unsupported, use `marginBottom: sm` on items AND `columnGap: sm` or padding-based approach.
- **Card internal padding:** `md` (16px) on all sides.
- **List item spacing:** `sm` (12px) gap between list items. Never stack items with 0 gap.
- **Button row gap:** `sm` (12px) between side-by-side buttons.

#### 6.8.2 Card Styling

Every card must have:
- `backgroundColor`: `surface` token (white in light, #1E293B in dark)
- `borderRadius`: `md` (16px)
- `borderWidth`: 1, `borderColor`: `border` token
- `shadowColor`: dark in light mode, none in dark mode
- `shadowOffset`: { width: 0, height: 2 }, `shadowOpacity`: 0.06, `shadowRadius`: 8
- `padding`: `md` (16px)

Do NOT use the default Ignite Card component borders (they are too heavy). Override card styles
to match these lighter, modern borders.

#### 6.8.3 Icon Badges (colored icon containers)

Icons in cards and list items must NOT be bare icons floating in space.
They must sit inside a **colored badge container**:

**Icon source:** Use the project `Icon` component (`@/components/Icon`). It supports **font icons** from `@expo/vector-icons` (e.g. Ionicons, MaterialCommunityIcons): pass `font` + `icon` (icon name string) for wifi, bluetooth, camera, speaker, etc. For Tab Bar and any custom artwork, use the same Icon with font icons, or PNG/SVG from `assets/icons/` (iconRegistry or react-native-svg). Do not assume a single “icon font” for the whole app — the codebase supports both font and image icons; prefer **font icons** for feature/category icons so names like "wifi", "bluetooth", "camera" work without adding assets.

```typescript
// Example: StatCard icon badge
const $iconBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#EEF2FF",  // from feature accent table — light icon badge bg
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.xs,
})
// The icon itself is rendered inside this badge, with the feature accent color as tint.
```

Rules:
- Badge size: 40x40 for stat cards, 48x48 for feature cards, 36x36 for list items
- Badge borderRadius: 12
- Badge background: the light/dark "Icon Badge BG" color from the feature accent table
- Icon color: the feature's accent color (e.g., indigo for CPU, amber for temperature)
- This applies to: StatCard icons, FeatureCard icons, list item left icons

#### 6.8.4 Progress Bar Colors

Progress bars must use **color based on the value being shown**, not a single default color:

- CPU usage: indigo (#6366F1), shifts to amber >70%, red >90%
- Temperature: green (#10B981) <60°C, amber (#F59E0B) 60-75°C, red (#EF4444) >75°C
- Memory: violet (#8B5CF6), shifts to amber >70%, red >90%
- Disk: cyan (#06B6D4), shifts to amber >70%, red >90%
- Wi-Fi signal: green >70%, amber 40-70%, red <40%

Progress bar track (background): `border` token color. Progress bar height: 6px. Border radius: 3px.

#### 6.8.5 Stat Values

Large stat numbers (e.g., "45%", "52°C") must be visually prominent:
- Font size: 28-32px, weight: Bold
- Color: `text` token (primary), NOT dimmed
- Unit text (%, °C, GB): smaller (14px), `textDim` color, placed next to the value with `xxs` gap

#### 6.8.6 Section Headers

Section titles (e.g., "Network", "Connected Devices") must have:
- Weight: SemiBold, size: 16-18px
- Color: `text` token
- `marginBottom: sm` (12px) below the title before content
- Optional right-side action (e.g., "Scan" button) aligned to the right of the same row

#### 6.8.7 List Items

List items (Wi-Fi networks, Bluetooth devices, settings rows) must have:
- `paddingVertical: sm` (12px) — gives breathing room
- `paddingHorizontal: md` (16px)
- Separator line between items: 1px, `border` token color, with `marginLeft` to align past the icon
- Left icon in a colored badge (see 6.8.3)
- Right side: value text or chevron icon in `textDim` color
- Touch feedback: subtle background color change on press (use `Pressable` with `pressed` state → `surfaceElevated` background)

#### 6.8.8 FeatureCard (Control Menu Grid)

Each feature card in the Control Menu must feel tappable and visually distinct:
- Height: ~120px
- Top section: large colored icon badge (48x48, using feature accent color)
- Below icon: feature name in `cardTitle` weight
- Below name: status subtitle in `caption` size, `textDim` color
- Left colored accent bar: 4px wide vertical bar on the left edge of the card, using the feature's accent color. This makes each card visually unique even at a glance.
- On press: scale to 0.97 + subtle shadow increase

#### 6.8.9 Empty & Loading States

- **Loading:** Use `SkeletonLoader` with subtle shimmer animation. Skeleton shapes must match the final layout (rounded rect for cards, circles for icons, thin rects for text lines).
- **Empty:** Center an icon + message vertically. Icon: 64px, `textDim` color. Text below: `body` size, `textDim`.

#### 6.8.10 Color Temperature Rule

Never have a screen that is only gray/white/black. Every screen must have at least:
- 1 accent-colored element (icon badge, progress bar, or status badge)
- Status indicators in semantic color (green/amber/red)
- The screen's feature accent color visible somewhere

This prevents the "monotone dashboard" problem.

### 6.4 Screen Layouts

#### 6.4.1 Dashboard Screen

**File:** `app/screens/WelcomeScreen.tsx` — rename to `DashboardScreen.tsx` (or rewrite in place).
The existing `WelcomeScreen` is the default landing screen in the navigator; reuse it as the
Dashboard instead of creating a new file. Update the route name from `"Welcome"` to `"Dashboard"`
in `AppNavigator.tsx` and `navigationTypes.ts`.

**Preset:** `scroll` (vertical scroll, pull-to-refresh enabled)

**Header area:**
- Thin custom header (not navigation header), height 48px
- Left: `ConnectionBadge` showing socket status (green dot + "Connected" / red dot + "Offline")
  - The badge uses `success` / `error` color tokens — always colorful, not gray
- Center: app title "Pi Manager" in `cardTitle` weight
- Right: settings gear icon (in `textDim` color), navigates to SettingsScreen

**Body — stats grid (2 columns, gap `sm` = 12px):**

Each `StatCard` follows section 6.8 styling rules strictly:
- Card has `surface` background, `border` token border (1px), borderRadius 16, padding `md`
- Top-left: **colored icon badge** (40x40, borderRadius 12, background from feature accent table)
  - CPU icon badge: bg #EEF2FF dark:#312E81, icon color #6366F1 dark:#818CF8
  - Temperature icon badge: bg #FFFBEB dark:#78350F, icon color #F59E0B dark:#FBBF24
  - Memory icon badge: bg #F5F3FF dark:#4C1D95, icon color #8B5CF6 dark:#A78BFA
  - Disk icon badge: bg #ECFEFF dark:#164E63, icon color #06B6D4 dark:#22D3EE
- Top-right: label text in `textDim`
- Center: stat value in 28px Bold (e.g., "45%"), `text` color — NOT dimmed
- Bottom: **colored progress bar** matching the feature accent (see 6.8.4 for threshold color shifts)
- Below progress bar: caption in 12px `textDim` (e.g., "Cortex-A72", "System Thermal")

Row 1: CPU card | Temperature card
Row 2: Memory card | Disk card
Gap between rows AND columns: `sm` (12px). Use `gap: 12` on the grid container.

**Section gap: `lg` (24px) between stats grid and next section.**

**Body — network card (full-width):**
- `SectionHeader` title "Network" with `sectionTitle` styling
- `Card` with `surface` background, borderRadius 16
- Each network interface is a row with:
  - Left: colored badge (36x36, blue bg #EFF6FF dark:#1E3A5F) with network icon (#3B82F6 dark:#60A5FA)
  - Center: interface name bold (wlan0, eth0) + IP address in `textDim` below
  - Right: colored status dot — `success` green if up, `error` red if down
- Rows separated by 1px `border` color divider
- Interfaces with no IP show "Not connected" in `textDim` + red dot

**Section gap: `lg` (24px) before device info.**

**Body — device info card (full-width):**
- `SectionHeader` title "Device Info"
- `Card` with `surface` background
- Key-value rows: Hostname, OS, Kernel, Uptime (formatted as "3d 14h 22m")
- Keys in `textDim`, values in `text` color, aligned right
- Icon badge on left: slate colored (bg #F1F5F9 dark:#334155, icon #64748B)

**Loading state:** All StatCards show `SkeletonLoader` with shimmer animation until first `system:stats` event. Skeleton shapes match the final layout: rounded rect for icon badge, thin rect for label, large rect for value, thin rect for progress bar.

**Components used:** `StatCard`, `ConnectionBadge`, `ProgressBar`, `SkeletonLoader`, `Card`, `SectionHeader`

#### 6.4.2 Control Menu Screen

**Preset:** `scroll` (scrollable when menu items grow beyond viewport)

**Header:** Standard `Header` component, title "Control"

**Data-driven design:** The menu is rendered from a `MENU_ITEMS` array. Adding a new feature
to the menu requires only adding an entry to this array — no layout or component changes needed.

```typescript
// app/screens/ControlMenuScreen.tsx

import type { FontFamily } from "@/components/Icon"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import type { TxKeyPath } from "@/i18n"

interface MenuItem {
  id: string                                   // unique key
  tx: TxKeyPath                                // i18n label, e.g. "controlMenu:wifi"
  font: FontFamily                             // icon font (e.g. "Ionicons", "MaterialCommunityIcons")
  icon: string                                 // icon name within that font (e.g. "wifi", "bluetooth")
  screen: keyof AppStackParamList              // navigate target
  accent: string                               // feature accent color (from 6.2 table)
  accentBgLight: string                        // icon badge bg for light mode
  accentBgDark: string                         // icon badge bg for dark mode
  subtitle?: () => string                      // dynamic subtitle (hook result, live status)
  danger?: boolean                             // true = red styling, overrides accent with error
  confirmTx?: TxKeyPath                        // confirm dialog message (required if danger)
  socketEvent?: string                         // if set, emit this event instead of navigating
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "wifi",
    tx: "controlMenu:wifi",
    font: "Ionicons",
    icon: "wifi",
    screen: "Wifi",
    accent: "#3B82F6",
    accentBgLight: "#EFF6FF",
    accentBgDark: "#1E3A5F",
  },
  {
    id: "bluetooth",
    tx: "controlMenu:bluetooth",
    font: "Ionicons",
    icon: "bluetooth",
    screen: "Bluetooth",
    accent: "#6366F1",
    accentBgLight: "#EEF2FF",
    accentBgDark: "#312E81",
  },
  {
    id: "audio",
    tx: "controlMenu:audio",
    font: "Ionicons",
    icon: "volume-high",
    screen: "Audio",
    accent: "#EC4899",
    accentBgLight: "#FDF2F8",
    accentBgDark: "#831843",
  },
  {
    id: "camera",
    tx: "controlMenu:camera",
    font: "Ionicons",
    icon: "camera",
    screen: "Camera",
    accent: "#10B981",
    accentBgLight: "#ECFDF5",
    accentBgDark: "#064E3B",
  },
  {
    id: "storage",
    tx: "controlMenu:storage",
    font: "MaterialCommunityIcons",
    icon: "harddisk",
    screen: "Storage",
    accent: "#06B6D4",
    accentBgLight: "#ECFEFF",
    accentBgDark: "#164E63",
  },
  {
    id: "reboot",
    tx: "controlMenu:reboot",
    font: "Ionicons",
    icon: "reload",
    screen: "Dashboard",
    accent: "#EF4444",
    accentBgLight: "#FEF2F2",
    accentBgDark: "#7F1D1D",
    danger: true,
    confirmTx: "controlMenu:rebootConfirm",
    socketEvent: "system:reboot",
  },
  // Adding a new menu item: just append here.
  // Example — GPIO control (future):
  // {
  //   id: "gpio",
  //   tx: "controlMenu:gpio",
  //   font: "MaterialCommunityIcons",
  //   icon: "chip",
  //   screen: "Gpio",
  //   accent: "#F59E0B",
  //   accentBgLight: "#FFFBEB",
  //   accentBgDark: "#78350F",
  // },
]
```

**Rendering:** `FlatList` with `numColumns={2}`, gap `sm` (12px) between items. Screen padding `md`.

Each `FeatureCard` must follow section 6.8.8:
- Card: `surface` bg, borderRadius 16, padding `md`, height ~120px
- **Left accent bar:** 4px wide, feature accent color, runs the full height of the card
- **Icon badge:** 48x48, borderRadius 12, feature accent bg from 6.2 table, icon in feature accent color
- **Title:** `cardTitle` weight (16px SemiBold)
- **Subtitle:** `caption` size (12px), `textDim` — shows live status from `useMenuSubtitles()`
- **Touch feedback:** scale 0.97 animation on press

Each `MenuItem` also carries an `accent` field (color string from the feature accent table in 6.2).
This accent is passed to `FeatureCard` for badge bg and left bar rendering.

Items with `danger: true` render full-width below the grid as a separate section, styled with
`error` color accent bar, `error` colored icon badge bg (#FEF2F2 dark:#7F1D1D), `error` icon tint.

**Subtitle logic:** Each card shows a live subtitle (e.g. current SSID, volume %).
Subtitles come from a `useMenuSubtitles()` hook that subscribes to the relevant socket
modules and returns a `Record<string, string>` keyed by `MenuItem.id`.

```typescript
// app/hooks/useMenuSubtitles.ts
export function useMenuSubtitles(): Record<string, string> {
  const wifiStatus = useWifiStatus()       // from wifi socket module
  const btStatus = useBluetoothStatus()    // from bluetooth socket module
  const audioState = useAudioState()       // from audio socket module
  const cameraState = useCameraState()     // from camera socket module
  const storageHealth = useStorageHealth() // from storage socket module

  return {
    wifi: wifiStatus?.ssid ?? "Disconnected",
    bluetooth: btStatus?.connectedDevices.length
      ? `${btStatus.connectedDevices.length} connected`
      : "Off",
    audio: audioState?.muted ? "Muted" : `Vol: ${audioState?.volume ?? 0}%`,
    camera: cameraState?.streaming ? "Streaming" : "Offline",
    storage: `Wear: ${storageHealth?.percentageUsed ?? 0}%`,
  }
}
```

**Tap behavior:**
- Normal item: `navigation.navigate(item.screen)`
- Danger item: show `ConfirmDialog` with `item.confirmTx` message → on confirm, emit `item.socketEvent`

**Components used:** `FeatureCard` (new), `ConfirmDialog` (new), `FlatList`

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

### 6.5 Component Library (new components to build)

All components follow project conventions: `$` prefix styles, `themed()` for dynamic styles,
`ThemedStyle<T>` functions, exported as named functions, no default exports.

| Component | Props | Description |
|-----------|-------|-------------|
| `StatCard` | `title`, `value`, `unit?`, `progress?`, `icon?`, `caption?` | Dashboard metric card with progress bar |
| `FeatureCard` | `title`, `subtitle`, `icon`, `onPress`, `status?` | Control menu grid item |
| `ConnectionBadge` | `status: "connected" \| "connecting" \| "disconnected" \| "error"` | Colored dot + label |
| `ProgressBar` | `value: number`, `color?`, `height?` | Thin horizontal progress |
| `SectionHeader` | `title`, `rightAction?` | Section label with optional action button |
| `NetworkListItem` | `network: WifiNetwork`, `onPress` | Wi-Fi network row with signal icon |
| `DeviceListItem` | `device: BluetoothDevice`, `onPress` | Bluetooth device row |
| `VolumeSlider` | `value`, `onValueChange`, `muted` | Large-thumb slider with mute |
| `VideoPlayer` | `streamUrl?`, `isStreaming` | WebRTC video container |
| `SkeletonLoader` | `width`, `height`, `borderRadius` | Animated placeholder while loading |
| `BottomSheet` | `visible`, `onDismiss`, `children` | Slide-up modal for forms |
| `ConfirmDialog` | `title`, `message`, `onConfirm`, `onCancel` | Confirmation alert |

### 6.6 Animation & Micro-interactions

- **Skeleton loading**: shimmer effect on StatCards while waiting for first `system:stats` event.
- **Value transitions**: numbers animate from old→new (e.g. CPU 42%→47%) using `react-native-reanimated` shared values.
- **Connection banner**: slides down from top when disconnected, slides up when reconnected.
- **Tab switch**: cross-fade transition between screens.
- **Pull-to-refresh**: on Dashboard and list screens.
- **Card press**: subtle scale-down (0.97) on touch.

### 6.7 Responsive Layout

```
Width < 400px (Telegram Mini App):
  - 2-column grid for StatCards
  - Full-width cards for lists
  - Bottom sheet instead of modal dialogs

Width 400–768px (tablet):
  - 3-column grid for StatCards
  - Side-by-side cards where appropriate

Width > 768px (desktop):
  - Sidebar navigation instead of bottom tabs
  - Dashboard uses 4-column grid
```

---

## 7. Navigation Structure

```
AppStack (NativeStack, headerShown: false)
│
├── TelegramAuth                        # Validates initData, auto-redirects on success
├── AccessDenied                        # Shown when user ID not in whitelist
│
└── MainTabs (BottomTab)
    │
    ├── DashboardTab (NativeStack)
    │   └── DashboardScreen             # System stats overview
    │
    ├── ControlTab (NativeStack)
    │   ├── ControlMenuScreen           # Feature grid (Wi-Fi, BT, Audio, Camera, Storage)
    │   ├── WifiScreen                  # Wi-Fi management
    │   ├── BluetoothScreen             # Bluetooth management
    │   ├── AudioScreen                 # Audio control
    │   ├── CameraScreen                # WebRTC live view
    │   └── StorageScreen               # SSD health & S.M.A.R.T. data
    │
    └── SettingsTab (NativeStack)
        └── SettingsScreen              # Theme, language, connection info
```

### Tab Bar Configuration

- Height: 60px (includes safe area)
- Icons: use `Icon` component with font icons (e.g. Ionicons/MaterialCommunityIcons) or custom assets from `assets/icons/` (PNG/SVG)
- Active color: `tint` (indigo)
- Inactive color: `textDim`
- Background: `surface`
- Badge on Control tab: shows count of connected BT devices (optional)

---

*Last updated: 2026-02-21*
