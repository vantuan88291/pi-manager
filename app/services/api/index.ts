/**
 * Pi Manager API client (apisauce / axios).
 *
 * - `api` — singleton; base URL from `Config.API_URL` (see config.dev / config.prod).
 * - `getJsonApi` / `postJsonApi` / `deleteJsonApi` / `postMultipartApi` — Pi `/api/*` helpers with `RestApiError`.
 */
export { api, Api, DEFAULT_API_CONFIG } from "./apiCore"
export {
  deleteJsonApi,
  getJsonApi,
  getPiApiBaseUrl,
  postJsonApi,
  postMultipartApi,
  RestApiError,
} from "./piApi"
export type { RestApiErrorDetails, RestApiErrorPhase } from "./piApi"
