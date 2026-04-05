import express, { type Request, type Response } from "express"

const router = express.Router()

const MODEL_USAGE_SERVICE_URL =
  process.env.MODEL_USAGE_SERVICE_URL ?? process.env.MODEL_USAGE_API_URL ?? "http://localhost:20128"

function buildUsageUrl(): string {
  try {
    return new URL("/api/usage/history", MODEL_USAGE_SERVICE_URL).toString()
  } catch {
    return `${MODEL_USAGE_SERVICE_URL.replace(/\/$/, "")}/api/usage/history`
  }
}

router.get("/history", async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(buildUsageUrl(), { method: "GET" })
    const rawBody = await upstream.text()
    const contentType = upstream.headers.get("content-type") ?? ""

    if (!upstream.ok) {
      console.error("[model-usage] upstream error", upstream.status, rawBody)
      return res.status(502).json({
        success: false,
        error: "Model usage service responded with an error",
        status: upstream.status,
        body: rawBody,
      })
    }

    if (!contentType.includes("application/json")) {
      console.error("[model-usage] unexpected content-type", contentType)
      return res.status(502).json({
        success: false,
        error: "Model usage service returned non-JSON",
      })
    }

    let parsed: unknown
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {}
    } catch (parseError) {
      console.error("[model-usage] failed to parse JSON", parseError)
      return res.status(502).json({
        success: false,
        error: "Model usage service returned invalid JSON",
      })
    }

    return res.json(parsed)
  } catch (error) {
    console.error("[model-usage] fetch failed", error)
    return res.status(502).json({ success: false, error: "Unable to contact model usage service" })
  }
})

export default router
