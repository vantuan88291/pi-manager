# UI docs (index)

> Source of truth for UI spec.
>
> If you are an AI agent: **do not read everything at once**. Start from the roadmap below, then open only the linked docs for your phase/task.

## Roadmap (phases → docs to read)

### Phase 0 — Theme foundation (must do first)

- Read:
  - [`01-design-theme-typography.md`](./01-design-theme-typography.md)
  - [`02-styling-rules.md`](./02-styling-rules.md)

### Phase 1 — App shell + Dashboard

- Before starting: re-check Phase 0 rules (tokens + styling constraints) to avoid UI drift:
  - [`01-design-theme-typography.md`](./01-design-theme-typography.md)
  - [`02-styling-rules.md`](./02-styling-rules.md)

- Read:
  - [`06-navigation.md`](./06-navigation.md)
  - [`03-screens-dashboard-control.md`](./03-screens-dashboard-control.md)
  - [`05-components-and-interactions.md`](./05-components-and-interactions.md)

### Phase 2 — Control tab + peripherals screens

- Before starting: re-check Phase 1 navigation/screen naming + Phase 0 styling rules:
  - [`06-navigation.md`](./06-navigation.md)
  - [`02-styling-rules.md`](./02-styling-rules.md)
  - Re-check backend ack-only contract: [`../backend/03-operational-safety.md`](../backend/03-operational-safety.md)

- Read:
  - [`03-screens-dashboard-control.md`](./03-screens-dashboard-control.md) (ControlMenu)
  - [`04-screens-wifi-to-access-denied.md`](./04-screens-wifi-to-access-denied.md)
  - [`02-styling-rules.md`](./02-styling-rules.md)

### Phase 3 — Camera UI

- Before starting: re-check Phase 2 patterns (BottomSheet/dialog patterns + styling rules):
  - [`02-styling-rules.md`](./02-styling-rules.md)
  - [`04-screens-wifi-to-access-denied.md`](./04-screens-wifi-to-access-denied.md)
  - Re-check backend ack-only contract: [`../backend/03-operational-safety.md`](../backend/03-operational-safety.md)

- Read:
  - [`04-screens-wifi-to-access-denied.md`](./04-screens-wifi-to-access-denied.md) (CameraScreen)
  - [`05-components-and-interactions.md`](./05-components-and-interactions.md)

### Phase 4 — Telegram UI polish

- Before starting: re-check Phase 0 + Phase 1 constraints (theme tokens + navigation shell):
  - [`01-design-theme-typography.md`](./01-design-theme-typography.md)
  - [`06-navigation.md`](./06-navigation.md)

- Read:
  - [`01-design-theme-typography.md`](./01-design-theme-typography.md) (Telegram constraints note)
  - [`02-styling-rules.md`](./02-styling-rules.md)

### Phase 5 — UX polish & production readiness

- Before starting: re-check earlier rules to keep polish consistent (animations must not violate layout rules):
  - [`02-styling-rules.md`](./02-styling-rules.md)
  - [`05-components-and-interactions.md`](./05-components-and-interactions.md)

- Read:
  - [`05-components-and-interactions.md`](./05-components-and-interactions.md)
  - [`02-styling-rules.md`](./02-styling-rules.md)

---

## Index (topic map)

- **Design system**
  - [`01-design-theme-typography.md`](./01-design-theme-typography.md) — design principles, palette, Phase 0 theme foundation, typography scale
  - [`02-styling-rules.md`](./02-styling-rules.md) — mandatory spacing/card/list/progress rules

- **Screen specs**
  - [`03-screens-dashboard-control.md`](./03-screens-dashboard-control.md) — Dashboard + Control Menu
  - [`04-screens-wifi-to-access-denied.md`](./04-screens-wifi-to-access-denied.md) — Wi‑Fi, Bluetooth, Audio, Camera, Storage, Settings, AccessDenied

- **Components & behavior**
  - [`05-components-and-interactions.md`](./05-components-and-interactions.md) — new component list, animations, responsive rules
  - [`06-navigation.md`](./06-navigation.md) — navigation structure + tab bar config

