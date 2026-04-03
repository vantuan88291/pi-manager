import { FC, RefObject } from "react"
import { Platform } from "react-native"
import type { ChangeEvent } from "react"

export interface FileManagerWebUploadInputProps {
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

/** Hidden file input for web upload; no-op on native. */
export const FileManagerWebUploadInput: FC<FileManagerWebUploadInputProps> = ({
  inputRef,
  onChange,
}) => {
  if (Platform.OS !== "web") {
    return null
  }

  return <input ref={inputRef} type="file" style={{ display: "none" }} onChange={onChange} />
}
