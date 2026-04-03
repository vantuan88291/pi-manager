import express, { type NextFunction, type Request, type Response } from 'express'
import fs from 'fs/promises'
import path from 'path'
import multer from 'multer'

const router = express.Router()

const MAX_UPLOAD_MB = Math.min(Math.max(Number(process.env.MAX_UPLOAD_MB) || 512, 1), 2048)

const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
})

function parseFileUpload(req: Request, res: Response, next: NextFunction) {
  uploadParser.single('file')(req, res, (err: unknown) => {
    if (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
      if (code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: `File too large (max ${MAX_UPLOAD_MB}MB)`,
        })
      }
      const message = err instanceof Error ? err.message : 'Upload failed'
      return res.status(400).json({ success: false, error: message })
    }
    next()
  })
}

// Allowed base paths for security
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
  '/home/vantuan88291',  // User's home directory
]

function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  return ALLOWED_ROOTS.some(root => resolved.startsWith(root))
}

function isSystemPath(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  const userHome = process.env.HOME || '/home/vantuan88291'
  
  // Check PROTECTED_PATHS - but only EXACT match, NOT children
  if (PROTECTED_PATHS.some(protectedPath => resolved === protectedPath)) {
    return true
  }
  
  // Only protect user's home directory itself, NOT its contents
  if (resolved === userHome) {
    return true
  }
  
  return false
}

function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'json': 'json', 'md': 'markdown', 'html': 'html', 'css': 'css',
    'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml', 'py': 'python',
    'sh': 'shell', 'bash': 'shell', 'env': 'shell', 'log': 'text', 'txt': 'text',
  }
  return languageMap[ext || ''] || 'text'
}

// Get file content
router.get('/read', async (req, res) => {
  try {
    const filePath = req.query.path as string
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }
    
    if (!isPathAllowed(filePath)) {
      return res.status(403).json({ success: false, error: 'Access denied: Path not allowed' })
    }
    
    const content = await fs.readFile(filePath, 'utf8')
    const stats = await fs.stat(filePath)
    const language = getLanguageFromExtension(path.basename(filePath))
    
    res.json({
      success: true,
      data: {
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtimeMs,
        language,
      },
    })
  } catch (error: any) {
    console.error('[files] read error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to read file',
    })
  }
})

// Save file content (utf8 string or base64 for binary uploads)
router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content, encoding } = req.body as {
      path?: string
      content?: string
      encoding?: 'utf8' | 'base64'
    }

    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Path and content are required',
      })
    }

    if (!isPathAllowed(filePath)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Path not allowed',
      })
    }

    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    if (encoding === 'base64') {
      await fs.writeFile(filePath, Buffer.from(content, 'base64'))
    } else {
      await fs.writeFile(filePath, content, 'utf8')
    }
    
    res.json({
      success: true,
      message: 'File saved successfully',
    })
  } catch (error: any) {
    console.error('[files] write error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save file',
    })
  }
})

/**
 * Multipart upload: field `targetDir` (absolute directory path) + file field `file`.
 * Streams into memory then writes once — suitable for Pi; tune MAX_UPLOAD_MB if needed.
 */
router.post('/upload', parseFileUpload, async (req, res) => {
  try {
    const targetDir = typeof req.body?.targetDir === 'string' ? req.body.targetDir : ''
    const file = req.file

    if (!targetDir || !file?.buffer) {
      return res.status(400).json({
        success: false,
        error: 'targetDir and file are required',
      })
    }

    if (!isPathAllowed(targetDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: target directory not allowed',
      })
    }

    let stat
    try {
      stat = await fs.stat(targetDir)
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Target directory does not exist',
      })
    }

    if (!stat.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'targetDir must be a directory',
      })
    }

    const safeName = path.basename(file.originalname || '')
    if (!safeName || safeName === '.' || safeName === '..') {
      return res.status(400).json({ success: false, error: 'Invalid file name' })
    }

    const resolvedDir = path.resolve(targetDir)
    const fullPath = path.resolve(path.join(resolvedDir, safeName))
    const rel = path.relative(resolvedDir, fullPath)
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return res.status(400).json({ success: false, error: "Invalid path" })
    }

    if (!isPathAllowed(fullPath)) {
      return res.status(403).json({ success: false, error: 'Access denied: Path not allowed' })
    }

    await fs.writeFile(fullPath, file.buffer)

    res.json({
      success: true,
      message: 'Uploaded successfully',
      path: fullPath,
    })
  } catch (error: any) {
    console.error('[files] upload error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload',
    })
  }
})

// List directory contents
router.get('/list', async (req, res) => {
  try {
    const dirPath = req.query.path as string
    
    if (!dirPath) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }
    
    if (!isPathAllowed(dirPath)) {
      return res.status(403).json({ success: false, error: 'Access denied: Path not allowed' })
    }
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items = []
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (!isPathAllowed(fullPath)) continue
      
      const stats = await fs.stat(fullPath)
      const isSystem = isSystemPath(fullPath)
      
      items.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtimeMs,
        isSystem,
      })
    }
    
    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'directory' ? -1 : 1
    })
    
    res.json({
      success: true,
      timestamp: Date.now(),
      data: {
        path: dirPath,
        items,
        parentPath: path.dirname(dirPath) !== dirPath ? path.dirname(dirPath) : undefined,
      },
    })
  } catch (error: any) {
    console.error('[files] list error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list directory',
    })
  }
})

// Delete file or folder
router.delete('/delete', async (req, res) => {
  try {
    const filePath = req.query.path as string
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }
    
    if (!isPathAllowed(filePath)) {
      return res.status(403).json({ success: false, error: 'Access denied: Path not allowed' })
    }
    
    // Prevent deleting system files/folders
    if (isSystemPath(filePath)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete system file or folder' 
      })
    }
    
    await fs.rm(filePath, { recursive: true, force: true })
    
    res.json({
      success: true,
      message: 'Deleted successfully',
    })
  } catch (error: any) {
    console.error('[files] delete error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete',
    })
  }
})

// Create folder
router.post('/create-folder', async (req, res) => {
  try {
    const { path: folderPath } = req.body
    
    if (!folderPath) {
      return res.status(400).json({ success: false, error: 'Path is required' })
    }
    
    if (!isPathAllowed(folderPath)) {
      return res.status(403).json({ success: false, error: 'Access denied: Path not allowed' })
    }
    
    await fs.mkdir(folderPath, { recursive: true })
    
    res.json({
      success: true,
      message: 'Folder created successfully',
    })
  } catch (error: any) {
    console.error('[files] create-folder error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create folder',
    })
  }
})

export default router
