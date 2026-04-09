import express from "express"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const router = express.Router()
const execAsync = promisify(exec)

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json")

const AVAILABLE_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-opus-latest",
]

async function readCurrentModel(): Promise<string | null> {
  try {
    const raw = await fs.readFile(CLAUDE_SETTINGS_PATH, "utf8")
    const settings = JSON.parse(raw)
    return settings.model ?? null
  } catch {
    return null
  }
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

// POST /api/claude-model — change model via `claude config set model <name>`
router.post("/", async (req, res) => {
  try {
    const { model } = req.body as { model?: string }

    if (!model || typeof model !== "string" || !model.trim()) {
      return res.status(400).json({ success: false, error: "model is required" })
    }

    const trimmed = model.trim()

    if (!AVAILABLE_MODELS.includes(trimmed)) {
      return res.status(400).json({
        success: false,
        error: `Invalid model. Available: ${AVAILABLE_MODELS.join(", ")}`,
      })
    }

    console.log(`[claude-model] setting model to: ${trimmed}`)

    await execAsync(`claude config set model ${trimmed}`)

    // Verify the change took effect
    const current = await readCurrentModel()

    res.json({
      success: true,
      message: `Model changed to ${trimmed}`,
      data: { model: current },
    })
  } catch (error: any) {
    console.error("[claude-model] set error:", error.message)
    res.status(500).json({ success: false, error: error.message || "Failed to set model" })
  }
})

export default router
