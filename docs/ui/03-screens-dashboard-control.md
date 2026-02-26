# UI — Screen Layouts (Dashboard, Control)

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

