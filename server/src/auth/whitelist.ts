import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WHITELIST_PATH = path.join(__dirname, "../config/whitelist.json")

class Whitelist {
  private allowed = new Set<number>()

  constructor() {
    this.load()
    this.watch()
  }

  load() {
    try {
      if (!fs.existsSync(WHITELIST_PATH)) {
        const adminId = Number(process.env.ADMIN_TELEGRAM_ID)
        const initial = adminId ? [adminId] : []
        fs.mkdirSync(path.dirname(WHITELIST_PATH), { recursive: true })
        fs.writeFileSync(WHITELIST_PATH, JSON.stringify(initial, null, 2))
        if (!adminId) {
          console.warn("[whitelist] Empty whitelist created. Set ADMIN_TELEGRAM_ID in .env or edit whitelist.json.")
        }
      }
      const raw = JSON.parse(fs.readFileSync(WHITELIST_PATH, "utf-8"))
      this.allowed = new Set(Array.isArray(raw) ? raw : [])
      console.log(`[whitelist] loaded ${this.allowed.size} user(s)`)
    } catch (err) {
      console.error("[whitelist] failed to load:", err)
    }
  }

  private watch() {
    fs.watch(WHITELIST_PATH, () => {
      console.log("[whitelist] file changed, reloading...")
      this.load()
    })
  }

  isAllowed(userId: number): boolean {
    // Dev mode: allow all if no bot token configured
    if (!process.env.TELEGRAM_BOT_TOKEN) return true
    return this.allowed.has(userId)
  }
}

export const whitelist = new Whitelist()
