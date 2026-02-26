# Backend docs (index)

> Source of truth for backend + socket spec.
>
> If you are an AI agent: **do not read everything at once**. Start from the roadmap below, then open only the linked docs for your phase/task.

## Roadmap (phases → docs to read)

### Phase 1 — Foundation (server + shared + socket core)

- Read:
  - [`01-socket-architecture.md`](./01-socket-architecture.md)
  - [`02-event-contracts.md`](./02-event-contracts.md)
  - [`03-operational-safety.md`](./03-operational-safety.md)
  - [`05-commands-env-quickstart.md`](./05-commands-env-quickstart.md)
  - [`07-shared-data-types.md`](./07-shared-data-types.md)
  - [`appendix-a-server-bootstrap.md`](./appendix-a-server-bootstrap.md)
  - [`appendix-b-shared-socket-event-map.md`](./appendix-b-shared-socket-event-map.md)

### Phase 2 — Core peripherals (server modules)

- Before starting: re-check Phase 1 rules (contracts + safety) to avoid drift:
  - [`02-event-contracts.md`](./02-event-contracts.md)
  - [`03-operational-safety.md`](./03-operational-safety.md)
  - [`07-shared-data-types.md`](./07-shared-data-types.md)

- Read:
  - [`02-event-contracts.md`](./02-event-contracts.md)
  - [`03-operational-safety.md`](./03-operational-safety.md)
  - [`07-shared-data-types.md`](./07-shared-data-types.md)

### Phase 3 — Camera & WebRTC (server)

- Before starting: re-check Phase 2 rules (same contracts/safety apply; camera adds one ack exception):
  - [`02-event-contracts.md`](./02-event-contracts.md)
  - [`03-operational-safety.md`](./03-operational-safety.md)

- Read:
  - [`02-event-contracts.md`](./02-event-contracts.md)
  - Also read: [`03-operational-safety.md`](./03-operational-safety.md) (ack/timeout + rate limit; snapshot is the ack exception)
  - [`appendix-e-webrtc-camera-stack.md`](./appendix-e-webrtc-camera-stack.md)

### Phase 4 — Telegram + tunnel + deploy wiring

- Before starting: re-check Phase 3/Phase 1 rules if you touch socket auth/session behavior:
  - [`01-socket-architecture.md`](./01-socket-architecture.md) (auth/session + reconnect)
  - [`appendix-c-telegram-mini-app-integration.md`](./appendix-c-telegram-mini-app-integration.md)

- Read:
  - [`appendix-c-telegram-mini-app-integration.md`](./appendix-c-telegram-mini-app-integration.md)
  - [`04-deployment.md`](./04-deployment.md)
  - [`appendix-d-cloudflare-tunnel.md`](./appendix-d-cloudflare-tunnel.md)
  - [`05-commands-env-quickstart.md`](./05-commands-env-quickstart.md)

### Phase 5 — Safety & production hardening (server)

- Before starting: re-check Phase 1–4 rules for consistency (especially ack-only + rate limits + deploy pipeline):
  - [`03-operational-safety.md`](./03-operational-safety.md)
  - [`04-deployment.md`](./04-deployment.md)

- Read:
  - [`03-operational-safety.md`](./03-operational-safety.md)
  - [`04-deployment.md`](./04-deployment.md)
  - [`05-commands-env-quickstart.md`](./05-commands-env-quickstart.md)

---

## Index (topic map)

- **Core socket spec**
  - [`01-socket-architecture.md`](./01-socket-architecture.md) — module registry, lifecycle, reconnect strategy, auth middleware (overview), event naming, “add new module” checklist
  - [`02-event-contracts.md`](./02-event-contracts.md) — event tables + payload contracts per module
  - [`03-operational-safety.md`](./03-operational-safety.md) — ack/timeout, rate limiting, validation, destructive confirms

- **Delivery / ops**
  - [`04-deployment.md`](./04-deployment.md) — production deployment, static serving, systemd, tunnel notes
  - [`05-commands-env-quickstart.md`](./05-commands-env-quickstart.md) — commands, env vars, quick start

- **Shared types**
  - [`07-shared-data-types.md`](./07-shared-data-types.md) — data types under `shared/`
  - [`08-tech-stack-and-providers.md`](./08-tech-stack-and-providers.md) — backend/frontend stack + `app.tsx` provider tree

## Appendices (copy-paste ready)

- [`appendix-a-server-bootstrap.md`](./appendix-a-server-bootstrap.md) — server skeleton, auth/whitelist snippets
- [`appendix-b-shared-socket-event-map.md`](./appendix-b-shared-socket-event-map.md) — typed socket event map for shared types
- [`appendix-c-telegram-mini-app-integration.md`](./appendix-c-telegram-mini-app-integration.md) — initData, dev bypass, bot setup notes
- [`appendix-d-cloudflare-tunnel.md`](./appendix-d-cloudflare-tunnel.md) — named tunnel config + systemd
- [`appendix-e-webrtc-camera-stack.md`](./appendix-e-webrtc-camera-stack.md) — WebRTC approach, constraints, module outline

