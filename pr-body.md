## 🎯 Problem

When restarting the Cloudflare tunnel, the websocket connection would fail because the tunnel URL was hardcoded into the JS bundle at build time. Each tunnel restart generated a new URL, but the built frontend still tried to connect to the old URL.

## ✅ Solution

**Use runtime URL detection instead of build-time injection:**

- **SocketManager.ts**: Now uses `window.location.origin` to get the socket URL at runtime
- **start-with-tunnel.sh**: Removed complex sed replacement steps (no longer needed)
- Clear Metro cache during build to ensure fresh builds

## 🎨 UI Improvements

### Bottom Tab Bar - Fix Text Clipping
- **height**: 64px (increased from 60)
- **fontSize**: 12 (increased from 11)  
- **tabBarIconStyle**: height 24px
- Removed hardcoded padding, using natural layout
- Text no longer clipped/hidden

### Debug Info Card - Always Visible
- Removed `__DEV__` check - card now always visible for debugging
- **InitData JSON**: Full Telegram initDataUnsafe displayed as formatted JSON
- **User ID**: Separate row showing Telegram user ID (selectable/copyable)
- **Retry logic**: Capture Telegram WebApp immediately + after 1s delay
- **Console logging**: Added debug logs for troubleshooting

## 📝 Changes

| File | Changes |
|------|---------|
| `app/services/socket/SocketManager.ts` | Runtime URL detection via `window.location.origin` + debug logging |
| `scripts/start-with-tunnel.sh` | Simplified from 7→6 steps, removed URL injection |
| `app/navigators/MainTabNavigator.tsx` | Tab bar height 64px, font size 12 |
| `app/screens/SettingsScreen.tsx` | Always show Debug card, InitData JSON display, User ID row |
| `app/i18n/en.ts`, `vi.ts` | Added 'userId' translation key |

## 🧪 Testing

### Socket URL Fix
1. Run `yarn start:full`
2. Open the generated tunnel URL
3. Verify websocket connection succeeds
4. Restart tunnel → new URL should work without rebuild

### Tab Bar Fix
1. Open app in Telegram
2. Check bottom tab bar - text should be fully visible
3. No clipping or hidden text

### Debug Info
1. Go to Settings screen
2. Scroll to Debug Info card (always visible now)
3. Check:
   - Connection Status
   - Authenticated status
   - Socket URL
   - **User ID** (copyable)
   - **InitData JSON** (full Telegram user object)

## 📸 Before/After

**Before:** 
- Hardcoded URL in bundle → tunnel restart = broken connection
- Tab bar text clipped/hidden
- Debug card only in dev mode

**After:** 
- Runtime detection → tunnel restart = no issue
- Tab bar text fully visible
- Debug card always visible for troubleshooting
