import { deleteJsonApi, getJsonApi, postJsonApi } from "@/services/api"

import type { FileInfo } from "../../shared/types/file-manager"

/** One row from GET /api/files/list `data.items` (subset of FileInfo). */
export type RestFileListItem = {
  name: string
  path: string
  type: "file" | "directory"
  size: number
  modified: number
  isSystem: boolean
}

export function mapRestFileListItemToFileInfo(raw: RestFileListItem): FileInfo {
  const isDir = raw.type === "directory"
  const { name } = raw
  let extension: string | undefined
  if (!isDir) {
    const parts = name.split(".")
    extension = parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : undefined
  }
  return {
    name,
    path: raw.path,
    type: raw.type,
    size: raw.size,
    modified: raw.modified,
    permissions: "",
    isHidden: name.startsWith("."),
    isSystem: raw.isSystem,
    extension,
    mimeType: undefined,
  }
}

export async function fileManagerListDirectory(dirPath: string): Promise<{
  path: string
  items: FileInfo[]
  parentPath?: string
}> {
  const q = encodeURIComponent(dirPath)
  const json = await getJsonApi<{
    success: true
    data: {
      path: string
      items: RestFileListItem[]
      parentPath?: string
    }
  }>(`/api/files/list?path=${q}`)
  return {
    path: json.data.path,
    items: json.data.items.map(mapRestFileListItemToFileInfo),
    parentPath: json.data.parentPath,
  }
}

export async function fileManagerDeletePath(filePath: string): Promise<string | undefined> {
  const q = encodeURIComponent(filePath)
  const json = await deleteJsonApi<{ success: true; message?: string }>(
    `/api/files/delete?path=${q}`,
  )
  return json.message
}

export async function fileManagerRenamePath(
  filePath: string,
  newName: string,
): Promise<string | undefined> {
  const json = await postJsonApi<{ success: true; message?: string }>("/api/files/rename", {
    path: filePath,
    newName,
  })
  return json.message
}

export async function fileManagerMovePath(
  filePath: string,
  destinationDir: string,
): Promise<string | undefined> {
  const json = await postJsonApi<{ success: true; message?: string }>("/api/files/move", {
    path: filePath,
    destinationDir,
  })
  return json.message
}
