/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import { getBackendBaseUrl } from "@/utils/backendBaseUrl"

export default {
  /** Pi server REST base (same rules as Socket.IO). */
  API_URL: getBackendBaseUrl(),
}
