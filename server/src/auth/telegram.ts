import crypto from "node:crypto"

interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  if (!botToken) {
    // Dev mode: allow bypass
    return { id: 0, firstName: "Developer" }
  }

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return null

  params.delete("hash")
  params.sort()

  const dataCheckString = Array.from(params.entries())
    .map(([key, val]) => `${key}=${val}`)
    .join("\n")

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (hash !== expectedHash) return null

  // Check auth_date freshness (reject if > 1 hour old)
  const authDate = Number(params.get("auth_date") ?? 0)
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 3600) return null

  try {
    const userJson = params.get("user")
    if (!userJson) return null
    const raw = JSON.parse(userJson)
    return {
      id: raw.id,
      firstName: raw.first_name ?? "",
      lastName: raw.last_name,
      username: raw.username,
      photoUrl: raw.photo_url,
      languageCode: raw.language_code,
    }
  } catch {
    return null
  }
}
