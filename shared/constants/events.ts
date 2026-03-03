// Auth events (handled via Socket.IO handshake, not custom events)
// Server emits: "auth:success"
// Errors: "AUTH_REQUIRED" | "AUTH_INVALID" | "ACCESS_DENIED" | "SESSION_EXPIRED"

// Module subscription
export const MODULE_SUBSCRIBE = "module:subscribe"
export const MODULE_UNSUBSCRIBE = "module:unsubscribe"

// System module
export const SYSTEM_STATS = "system:stats"
export const SYSTEM_INFO = "system:info"
export const SYSTEM_REBOOT = "system:reboot"

// Wi-Fi module
export const WIFI_SCAN = "wifi:scan"
export const WIFI_CONNECT = "wifi:connect"
export const WIFI_DISCONNECT = "wifi:disconnect"
export const WIFI_FORGET = "wifi:forget"
export const WIFI_NETWORKS = "wifi:networks"
export const WIFI_STATUS = "wifi:status"

// Bluetooth module
export const BLUETOOTH_SCAN = "bluetooth:scan"
export const BLUETOOTH_STOP_SCAN = "bluetooth:stop_scan"
export const BLUETOOTH_PAIR = "bluetooth:pair"
export const BLUETOOTH_UNPAIR = "bluetooth:unpair"
export const BLUETOOTH_CONNECT = "bluetooth:connect"
export const BLUETOOTH_DISCONNECT = "bluetooth:disconnect"
export const BLUETOOTH_DEVICES = "bluetooth:devices"
export const BLUETOOTH_STATUS = "bluetooth:status"

// Audio module
export const AUDIO_SET_VOLUME = "audio:set_volume"
export const AUDIO_SET_OUTPUT = "audio:set_output"
export const AUDIO_TOGGLE_MUTE = "audio:toggle_mute"
export const AUDIO_TEST_SOUND = "audio:test_sound"
export const AUDIO_STATE = "audio:state"

// Camera module
export const CAMERA_START = "camera:start"
export const CAMERA_STOP = "camera:stop"
export const CAMERA_SNAPSHOT = "camera:snapshot"
export const CAMERA_SNAPSHOT_RESULT = "camera:snapshot_result"
export const CAMERA_OFFER = "camera:offer"
export const CAMERA_ANSWER = "camera:answer"
export const CAMERA_ICE_CANDIDATE = "camera:ice_candidate"
export const CAMERA_ERROR = "camera:error"

// Storage module
export const STORAGE_REFRESH = "storage:refresh"
export const STORAGE_HEALTH = "storage:health"

// Global error
export const ERROR = "error"
