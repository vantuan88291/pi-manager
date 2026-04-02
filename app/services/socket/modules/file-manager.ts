import { Socket } from 'socket.io-client'
import type { SocketModule } from '../types'
import type { FileInfo, FileContent, DirectoryListResponse, QuickAccessPath } from '../../../../../shared/types/file-manager'

type DirectoryListCallback = (result: DirectoryListResponse) => void
type FileReadCallback = (result: { success: boolean; data?: FileContent; error?: string }) => void
type FileWriteCallback = (result: { success: boolean; message?: string; error?: string }) => void
type FileDeleteCallback = (result: { success: boolean; message?: string; error?: string }) => void
type FileCreateFolderCallback = (result: { success: boolean; message?: string; error?: string }) => void
type FileRenameCallback = (result: { success: boolean; message?: string; error?: string }) => void
type QuickAccessCallback = (result: { paths: QuickAccessPath[] }) => void

class FileManagerClientModule implements SocketModule {
  name = 'file-manager'
  private socket: Socket | null = null
  private listCallbacks: Set<DirectoryListCallback> = new Set()
  private readCallbacks: Set<FileReadCallback> = new Set()
  private writeCallbacks: Set<FileWriteCallback> = new Set()
  private deleteCallbacks: Set<FileDeleteCallback> = new Set()
  private createFolderCallbacks: Set<FileCreateFolderCallback> = new Set()
  private renameCallbacks: Set<FileRenameCallback> = new Set()
  private quickAccessCallbacks: Set<QuickAccessCallback> = new Set()
  private cachedQuickAccess: QuickAccessPath[] = []

  register(socket: Socket): void {
    this.socket = socket

    socket.on('file:list-result', (result: DirectoryListResponse) => {
      this.listCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:read-result', (result: { success: boolean; data?: FileContent; error?: string }) => {
      this.readCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:write-result', (result: { success: boolean; message?: string; error?: string }) => {
      this.writeCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:delete-result', (result: { success: boolean; message?: string; error?: string }) => {
      this.deleteCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:create-folder-result', (result: { success: boolean; message?: string; error?: string }) => {
      this.createFolderCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:rename-result', (result: { success: boolean; message?: string; error?: string }) => {
      this.renameCallbacks.forEach(cb => cb(result))
    })

    socket.on('file:quick-access', (result: { paths: QuickAccessPath[] }) => {
      this.cachedQuickAccess = result.paths
      this.quickAccessCallbacks.forEach(cb => cb(result))
    })
  }

  cleanup(): void {
    this.socket = null
  }

  subscribe(): void {
    // Handled by SocketManager
  }

  unsubscribe(): void {
    this.listCallbacks.clear()
    this.readCallbacks.clear()
    this.writeCallbacks.clear()
    this.deleteCallbacks.clear()
    this.createFolderCallbacks.clear()
    this.renameCallbacks.clear()
    this.quickAccessCallbacks.clear()
  }

  // Listeners
  onList(callback: DirectoryListCallback): () => void {
    this.listCallbacks.add(callback)
    return () => this.listCallbacks.delete(callback)
  }

  onRead(callback: FileReadCallback): () => void {
    this.readCallbacks.add(callback)
    return () => this.readCallbacks.delete(callback)
  }

  onWrite(callback: FileWriteCallback): () => void {
    this.writeCallbacks.add(callback)
    return () => this.writeCallbacks.delete(callback)
  }

  onDelete(callback: FileDeleteCallback): () => void {
    this.deleteCallbacks.add(callback)
    return () => this.deleteCallbacks.delete(callback)
  }

  onCreateFolder(callback: FileCreateFolderCallback): () => void {
    this.createFolderCallbacks.add(callback)
    return () => this.createFolderCallbacks.delete(callback)
  }

  onRename(callback: FileRenameCallback): () => void {
    this.renameCallbacks.add(callback)
    return () => this.renameCallbacks.delete(callback)
  }

  onQuickAccess(callback: QuickAccessCallback): () => void {
    this.quickAccessCallbacks.add(callback)
    if (this.cachedQuickAccess.length > 0) {
      callback({ paths: this.cachedQuickAccess })
    }
    return () => this.quickAccessCallbacks.delete(callback)
  }

  // Actions
  listDirectory(dirPath: string): void {
    console.log('[file-manager] listing directory:', dirPath, 'at', Date.now())
    // Add timestamp to force fresh data (cache busting)
    this.socket?.emit('file:list', { 
      path: dirPath,
      _t: Date.now()  // Cache busting timestamp
    })
  }

  readFile(filePath: string): void {
    this.socket?.emit('file:read', { path: filePath })
  }

  writeFile(filePath: string, content: string): void {
    this.socket?.emit('file:write', { path: filePath, content })
  }

  deleteFileOrFolder(itemPath: string): void {
    this.socket?.emit('file:delete', { path: itemPath })
  }

  createFolder(parentPath: string, name: string): void {
    this.socket?.emit('file:create-folder', { path: parentPath, name })
  }

  renameItem(oldPath: string, newName: string): void {
    this.socket?.emit('file:rename', { oldPath, newName })
  }

  requestQuickAccess(): void {
    this.socket?.emit('file:quick-access')
  }

  getQuickAccessPaths(): QuickAccessPath[] {
    return this.cachedQuickAccess
  }
}

export const fileManagerClientModule = new FileManagerClientModule()
