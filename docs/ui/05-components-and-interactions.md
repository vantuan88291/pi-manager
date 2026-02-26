# UI — Components & Interactions

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

