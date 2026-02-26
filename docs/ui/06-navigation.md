# UI — Navigation

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

