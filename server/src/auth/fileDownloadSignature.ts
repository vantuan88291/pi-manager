import crypto from "node:crypto"

function getSecret(): string {
  return (
    process.env.FILE_DOWNLOAD_SIGNING_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    "pi-manager-dev-download-secret"
  )
}

/** HMAC-SHA256 hex; payload is `${filePath}\n${expSec}` */
export function signFileDownload(filePath: string, expSec: number): string {
  const payload = `${filePath}\n${expSec}`
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

export function verifyFileDownloadSignature(
  filePath: string,
  expSec: number,
  sigHex: string,
): boolean {
  if (typeof filePath !== "string" || !filePath || typeof sigHex !== "string" || !sigHex) {
    return false
  }
  if (!Number.isFinite(expSec)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (expSec < nowSec) return false
  if (expSec > nowSec + 600) return false

  const expectedHex = signFileDownload(filePath, expSec)
  if (expectedHex.length !== sigHex.length) return false

  try {
    const a = Buffer.from(expectedHex, "hex")
    const b = Buffer.from(sigHex, "hex")
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
