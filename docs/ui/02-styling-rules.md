# UI — Styling Rules (mandatory)

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

**Icon source:** Use the project `Icon` component (`@/components/Icon`). It supports **font icons** from `@expo/vector-icons` (e.g. Ionicons, MaterialCommunityIcons): pass `font` + `icon` (icon name string) for wifi, bluetooth, camera, speaker, etc. For Tab Bar and any custom artwork, use the same Icon with font icons. Do not assume a single “icon font” for the whole app — the codebase supports both font and image icons; prefer **font icons** for feature/category icons so names like "wifi", "bluetooth", "camera" work without adding assets.

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

