# UI — Design, Theme, Typography

> Part of Pi Manager spec. See also:
> - [OVERVIEW.md](../OVERVIEW.md) — architecture, types, roadmap
> - [backend/README.md](../backend/README.md) — backend + socket spec (split docs)

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