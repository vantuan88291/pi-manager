// File Manager Types

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modified: number  // Unix timestamp
  permissions: string
  isHidden: boolean
  extension?: string
  mimeType?: string
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf8' | 'base64'
  size: number
  lines: number
}

export interface FileOperation {
  action: 'read' | 'write' | 'delete' | 'create-folder' | 'rename' | 'move' | 'copy'
  path: string
  content?: string
  newPath?: string
}

export interface FileOperationResponse {
  success: boolean
  message?: string
  data?: FileInfo | FileContent | FileInfo[]
  error?: string
}

export interface DirectoryListResponse {
  path: string
  items: FileInfo[]
  parentPath?: string
  error?: string
}

export interface FileUploadRequest {
  path: string
  filename: string
  content: string  // base64 encoded
}

// Quick access paths
export const QUICK_ACCESS_PATHS = [
  { label: 'Home', path: '/home' },
  { label: 'Logs', path: '/var/log' },
  { label: 'Config', path: '/etc' },
  { label: 'Temp', path: '/tmp' },
  { label: 'Code', path: '/home/vantuan88291/.openclaw/workspace/code' },
  { label: 'Pi Manager', path: '/home/vantuan88291/.openclaw/workspace/code/reactnative/pi-manager' },
] as const

export type QuickAccessPath = typeof QUICK_ACCESS_PATHS[number]
