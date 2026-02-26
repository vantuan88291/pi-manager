# AI Work Plan — Pi Manager (PM Setup)

> AI-consumable execution setup.
> **Source of truth:** `docs/OVERVIEW.md`, `docs/BACKEND.md`, `docs/UI.md` (do not use `docs/PROJECT.md` — deprecated).

---

## 1) Rules (must-follow)

- Follow spec: **OVERVIEW.md** (architecture, structure, roadmap summary), **BACKEND.md** (socket, server, data types, commands), **UI.md** (screens, components, styling).
- Follow conventions: `.cursor/rules/project-conventions.mdc`

---

## 2) Simplified setup (3 worker models)

- **PM/Reviewer (always)**: **Gemini 3 Pro**
  - Reviews **every PR** before merge; enforces spec + contracts.

- **Backend worker**: **Qwen Coder**
  - Owns: `server/` + server-side modules + server safety (roadmap Phases 1–3, server parts of Phase 5).

- **Frontend worker**: **Gemini 3 Flash**
  - Owns: `app/` (socket client + hooks + navigation + UI/screens/components) (roadmap Phases 1–3, client parts of Phase 5).

- **Deploy + Telegram worker**: **Kimi 2.5**
  - Owns: Cloudflare Tunnel config + systemd + Telegram bot/Mini App wiring + production runbooks (roadmap Phase 4 + deploy parts of Phase 5).

Optional helper (only if needed): **MiniMax 2.5** for CI/E2E notes/checklists.

---

## 3) Workflow (mandatory)

- Pick the next task from **OVERVIEW.md Section 12 (Roadmap summary)** or the detailed checklists in **BACKEND.md** / **UI.md**.
- Create a branch: `feat/<short-task>`
- Implement the task.
- Open a PR with:
  - Summary
  - How to verify (commands + expected output)
- PM/Reviewer (**Gemini 3 Pro**) reviews.
- Merge only after approval.

---
