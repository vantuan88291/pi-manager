import express from 'express'
import fs from 'fs/promises'
import path from 'path'

const router = express.Router()

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

// Save file content
router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Path and content are required' 
      })
    }
    
    if (!isPathAllowed(filePath)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied: Path not allowed' 
      })
    }
    
    // Ensure parent directory exists
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    
    await fs.writeFile(filePath, content, 'utf8')
    
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
