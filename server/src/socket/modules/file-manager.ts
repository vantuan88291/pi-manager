import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { Server, Socket } from 'socket.io'
import type { ServerSocketModule } from '../types.js'
import type { FileInfo, FileContent, DirectoryListResponse } from '../../../../shared/types/file-manager.js'

const execAsync = promisify(exec)

// Allowed base paths (security)
const ALLOWED_ROOTS = [
  '/home',
  '/var/log',
  '/etc',
  '/tmp',
  '/opt',
  process.env.HOME || '/home/vantuan88291',
]

// Protected system paths that shouldn't be deleted
const PROTECTED_PATHS = [
  '/bin', '/sbin', '/usr', '/lib', '/lib64',
  '/proc', '/sys', '/dev', '/run', '/boot',
  '/etc/ssh', '/etc/network', '/etc/hosts', '/etc/resolv.conf',
  '/var', '/home', '/root',
]

function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  return ALLOWED_ROOTS.some(root => resolved.startsWith(root))
}

function isSystemPath(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  
  // Check if path is exactly a protected path or inside protected directory
  if (PROTECTED_PATHS.some(protectedPath => 
    resolved === protectedPath || resolved.startsWith(protectedPath + '/')
  )) {
    return true
  }
  
  // Only protect user's home directory itself, NOT its contents
  const userHome = process.env.HOME || '/home/vantuan88291'
  if (resolved === userHome) {
    return true  // Protect /home/vantuan88291 itself
  }
  
  return false  // Allow deleting contents inside user home
}

function getFileType(filename: string): 'file' | 'directory' {
  return filename.includes('.') && !filename.startsWith('.') ? 'file' : 'directory'
}

function getFileExtension(filename: string): string | undefined {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop() : undefined
}

function getMimeType(filename: string): string | undefined {
  const ext = getFileExtension(filename)?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'css': 'text/css',
    'html': 'text/html',
    'xml': 'application/xml',
    'yml': 'application/yaml',
    'yaml': 'application/yaml',
    'log': 'text/plain',
    'env': 'text/plain',
    'sh': 'text/x-sh',
    'py': 'text/x-python',
  }
  return mimeTypes[ext || '']
}

async function getFileStats(filePath: string): Promise<Partial<FileInfo>> {
  const stat = await fs.stat(filePath)
  return {
    size: stat.size,
    modified: stat.mtimeMs,
    permissions: stat.mode.toString(8).slice(-3),
    isHidden: path.basename(filePath).startsWith('.'),
  }
}

async function listDirectory(dirPath: string): Promise<DirectoryListResponse> {
  try {
    if (!isPathAllowed(dirPath)) {
      return {
        path: dirPath,
        items: [],
        error: 'Access denied: Path not allowed',
      }
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items: FileInfo[] = []

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      
      // Skip if not allowed
      if (!isPathAllowed(fullPath)) continue

      const stats = await getFileStats(fullPath)
      const isSystem = isSystemPath(fullPath)
      
      items.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size || 0,
        modified: stats.modified || Date.now(),
        permissions: stats.permissions || '644',
        isHidden: stats.isHidden || false,
        isSystem,
        extension: entry.isFile() ? getFileExtension(entry.name) : undefined,
        mimeType: entry.isFile() ? getMimeType(entry.name) : undefined,
      })
    }

    // Sort: directories first, then files (alphabetically)
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'directory' ? -1 : 1
    })

    // Get parent path
    const parentPath = path.dirname(dirPath)

    return {
      path: dirPath,
      items,
      parentPath: parentPath !== dirPath ? parentPath : undefined,
    }
  } catch (error: any) {
    return {
      path: dirPath,
      items: [],
      error: error.message || 'Failed to list directory',
    }
  }
}

async function readFileContent(filePath: string): Promise<FileContent> {
  try {
    if (!isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed')
    }

    // Check file size (max 1MB for viewing)
    const stats = await fs.stat(filePath)
    if (stats.size > 1024 * 1024) {
      throw new Error('File too large to display (max 1MB)')
    }

    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n').length

    return {
      path: filePath,
      content,
      encoding: 'utf8',
      size: stats.size,
      lines,
    }
  } catch (error: any) {
    throw error
  }
}

async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    if (!isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed')
    }

    // Ensure parent directory exists
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    await fs.writeFile(filePath, content, 'utf8')
  } catch (error: any) {
    throw error
  }
}

async function deleteFileOrFolder(itemPath: string): Promise<void> {
  try {
    if (!isPathAllowed(itemPath)) {
      throw new Error('Access denied: Path not allowed')
    }

    // Prevent deleting important directories
    const protectedPaths = ['/home', '/etc', '/var', '/tmp', '/opt']
    if (protectedPaths.some(p => itemPath === p || itemPath === process.env.HOME)) {
      throw new Error('Cannot delete protected system directory')
    }

    await fs.rm(itemPath, { recursive: true, force: true })
  } catch (error: any) {
    throw error
  }
}

async function createFolder(folderPath: string): Promise<void> {
  try {
    if (!isPathAllowed(folderPath)) {
      throw new Error('Access denied: Path not allowed')
    }

    await fs.mkdir(folderPath, { recursive: true })
  } catch (error: any) {
    throw error
  }
}

async function renameItem(oldPath: string, newPath: string): Promise<void> {
  try {
    if (!isPathAllowed(oldPath) || !isPathAllowed(newPath)) {
      throw new Error('Access denied: Path not allowed')
    }

    await fs.rename(oldPath, newPath)
  } catch (error: any) {
    throw error
  }
}

export const fileManagerModule: ServerSocketModule = {
  name: 'file-manager',

  register(socket: Socket, _io: Server) {
    // List directory contents
    socket.on('file:list', async ({ path: dirPath }: { path: string }) => {
      console.log(`[file-manager] listing: ${dirPath}`)
      console.log(`[file-manager] allowed roots: ${ALLOWED_ROOTS.join(', ')}`)
      console.log(`[file-manager] path allowed: ${isPathAllowed(dirPath)}`)
      const result = await listDirectory(dirPath)
      console.log(`[file-manager] result: ${result.items.length} items, error: ${result.error || 'none'}`)
      socket.emit('file:list-result', result)
    })

    // Read file content
    socket.on('file:read', async ({ path: filePath }: { path: string }) => {
      console.log(`[file-manager] reading: ${filePath}`)
      try {
        const content = await readFileContent(filePath)
        socket.emit('file:read-result', { success: true, data: content })
      } catch (error: any) {
        socket.emit('file:read-result', { 
          success: false, 
          error: error.message || 'Failed to read file' 
        })
      }
    })

    // Write file content
    socket.on('file:write', async ({ path: filePath, content }: { path: string; content: string }) => {
      console.log(`[file-manager] writing: ${filePath}`)
      try {
        await writeFileContent(filePath, content)
        socket.emit('file:write-result', { success: true, message: 'File saved' })
      } catch (error: any) {
        socket.emit('file:write-result', { 
          success: false, 
          error: error.message || 'Failed to write file' 
        })
      }
    })

    // Delete file or folder
    socket.on('file:delete', async ({ path: itemPath }: { path: string }) => {
      console.log(`[file-manager] deleting: ${itemPath}`)
      try {
        await deleteFileOrFolder(itemPath)
        socket.emit('file:delete-result', { success: true, message: 'Deleted successfully' })
      } catch (error: any) {
        socket.emit('file:delete-result', { 
          success: false, 
          error: error.message || 'Failed to delete' 
        })
      }
    })

    // Create folder
    socket.on('file:create-folder', async ({ path: parentPath, name }: { path: string; name: string }) => {
      const folderPath = path.join(parentPath, name)
      console.log(`[file-manager] creating folder: ${folderPath}`)
      try {
        await createFolder(folderPath)
        socket.emit('file:create-folder-result', { success: true, message: 'Folder created' })
      } catch (error: any) {
        socket.emit('file:create-folder-result', { 
          success: false, 
          error: error.message || 'Failed to create folder' 
        })
      }
    })

    // Rename file/folder
    socket.on('file:rename', async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      const newPath = path.join(path.dirname(oldPath), newName)
      console.log(`[file-manager] renaming: ${oldPath} -> ${newPath}`)
      try {
        await renameItem(oldPath, newPath)
        socket.emit('file:rename-result', { success: true, message: 'Renamed successfully' })
      } catch (error: any) {
        socket.emit('file:rename-result', { 
          success: false, 
          error: error.message || 'Failed to rename' 
        })
      }
    })

    // Quick access paths
    socket.on('file:quick-access', () => {
      socket.emit('file:quick-access', {
        paths: [
          { label: 'Home', path: process.env.HOME || '/home/vantuan88291' },
          { label: 'Logs', path: '/var/log' },
          { label: 'Config', path: '/etc' },
          { label: 'Temp', path: '/tmp' },
          { label: 'Pi Manager', path: '/home/vantuan88291/.openclaw/workspace/code/reactnative/pi-manager' },
        ],
      })
    })
  },

  onSubscribe(socket: Socket) {
    console.log(`[file-manager] subscriber added: ${socket.id}`)
    // Send quick access paths on subscribe
    socket.emit('file:quick-access', {
      paths: [
        { label: 'Home', path: process.env.HOME || '/home/vantuan88291' },
        { label: 'Logs', path: '/var/log' },
        { label: 'Config', path: '/etc' },
        { label: 'Temp', path: '/tmp' },
        { label: 'Pi Manager', path: '/home/vantuan88291/.openclaw/workspace/code/reactnative/pi-manager' },
      ],
    })
  },

  onUnsubscribe(socket: Socket) {
    console.log(`[file-manager] subscriber removed: ${socket.id}`)
  },
}
