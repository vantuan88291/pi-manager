import express from "express"
import fs from "fs/promises"
import os from "os"
import path from "path"

const router = express.Router()

// Support CLAUDE_SETTINGS_PATH env var to handle cases where server runs as root
// but Claude settings belong to another user (e.g. /home/vantuan88291/.claude/settings.json)
const CLAUDE_SETTINGS_PATH =
  process.env.CLAUDE_SETTINGS_PATH ||
  path.join(os.homedir(), ".claude", "settings.json")

const AVAILABLE_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
]

async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(CLAUDE_SETTINGS_PATH, "utf8")
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function readCurrentModel(): Promise<string | null> {
  const settings = await readSettings()
  const model = settings.model
  return typeof model === "string" ? model : null
}

// GET /api/claude-model — read current model from ~/.claude/settings.json
router.get("/", async (_req, res) => {
  try {
    const model = await readCurrentModel()
    res.json({
      success: true,
      data: {
        model,
        availableModels: AVAILABLE_MODELS,
      },
    })
  } catch (error: any) {
    console.error("[claude-model] read error:", error.message)
    res.status(500).json({ success: false, error: error.message || "Failed to read model" })
  }
})

// POST /api/claude-model — write model directly into ~/.claude/settings.json
router.post("/", async (req, res) => {
  try {
    const { model } = req.body as { model?: string }

    if (!model || typeof model !== "string" || !model.trim()) {
      return res.status(400).json({ success: false, error: "model is required" })
    }

    const trimmed = model.trim()

    // Basic format check: must look like a claude model name
    if (!/^claude-[\w.-]+$/.test(trimmed)) {
      return res.status(400).json({
        success: false,
        error: "Invalid model name format. Must start with 'claude-'",
      })
    }

    console.log(`[claude-model] setting model to: ${trimmed}`)

    // Ensure directory exists before writing
    await fs.mkdir(path.dirname(CLAUDE_SETTINGS_PATH), { recursive: true })

    // Read existing settings, update model key, write back
    const settings = await readSettings()
    settings.model = trimmed
    await fs.writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8")

    console.log(`[claude-model] written to ${CLAUDE_SETTINGS_PATH}`)

    res.json({
      success: true,
      message: `Model changed to ${trimmed}`,
      data: { model: trimmed },
    })
  } catch (error: any) {
    console.error("[claude-model] set error:", error.message)
    res.status(500).json({ success: false, error: error.message || "Failed to set model" })
  }
})

export default router
