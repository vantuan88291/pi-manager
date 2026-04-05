import express from "express"

const router = express.Router()

const MODEL_USAGE_SERVICE_URL =
  process.env.MODEL_USAGE_SERVICE_URL ?? process.env.MODEL_USAGE_API_URL ?? "http://localhost:20128"

function buildUrl(path: string) {
  try {
    return new URL(path, MODEL_USAGE_SERVICE_URL).toString()
  } catch {
    return `${MODEL_USAGE_SERVICE_URL.replace(/\/$/, "")}${path}`
  }
}

router.get("/", async (_req, res) => {
  try {
    const upstream = await fetch(buildUrl("/api/providers"))
    const bodyText = await upstream.text()

    if (!upstream.ok) {
      console.error("[usage-tracker] providers upstream error", upstream.status, bodyText)
      return res.status(502).json({
        success: false,
        error: "Providers service responded with an error",
        status: upstream.status,
        body: bodyText,
      })
    }

    const payload = JSON.parse(bodyText || "{}")
    const connections = Array.isArray(payload.connections) ? payload.connections : []

    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const copy = { ...conn }
        try {
          const usage = await fetch(buildUrl(`/api/usage/${conn.id}`))
          if (usage.ok) {
            copy.quotas = (await usage.json()).quotas
          } else {
            console.warn("[usage-tracker] usage request failed", conn.id, usage.status)
          }
        } catch (error) {
          console.error("[usage-tracker] usage fetch failed", conn.id, error)
        }
        return copy
      }),
    )

    return res.json({ connections: enriched })
  } catch (error) {
    console.error("[usage-tracker] fetch failed", error)
    return res.status(502).json({ success: false, error: "Unable to contact usage tracker" })
  }
})

export default router
