import { FC } from "react"
import { View, ViewStyle, TouchableOpacity, Pressable } from "react-native"
import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { formatFileSize, formatModifiedTime, getFileIcon } from "@/utils/fileManagerDisplay"

import type { FileInfo } from "../../../shared/types/file-manager"

export interface FileManagerFileListItemProps {
  item: FileInfo
  onPress: (item: FileInfo) => void
  onLongPress?: (item: FileInfo) => void
  onDelete?: (item: FileInfo) => void
}

export const FileManagerFileListItem: FC<FileManagerFileListItemProps> = ({
  item,
  onPress,
  onLongPress,
  onDelete,
}) => {
  const { themed, theme } = useAppTheme()
  const icon = getFileIcon(item)

  return (
    <TouchableOpacity
      style={themed($listItem)}
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
    >
      <View style={themed($itemContent)}>
        <View style={themed($iconBadge)}>
          <Icon font={icon.font} icon={icon.name} color={icon.color} size={24} />
        </View>
        <View style={themed($textContainer)}>
          <Text weight="medium" size="sm" color="text" numberOfLines={1}>
            {item.name}
          </Text>
          <View style={themed($metaRow)}>
            {item.type === "file" && (
              <>
                <Text size="xs" color="textDim">
                  {formatFileSize(item.size)}
                </Text>
                <Text size="xs" color="textDim" text="•" />
                <Text size="xs" color="textDim">
                  {formatModifiedTime(item.modified)}
                </Text>
              </>
            )}
            {item.type === "directory" && (
              <Text size="xs" color="textDim" tx="fileManager:itemTypeFolder" />
            )}
          </View>
        </View>
        <View style={themed($listActions)}>
          {item.isSystem ? (
            <Icon font="Ionicons" icon="lock-closed" size={20} color={theme.colors.tint} />
          ) : (
            !!onDelete && (
              <Pressable onPress={() => onDelete(item)} style={themed($deleteButton)}>
                <Icon font="Ionicons" icon="trash" size={18} color={theme.colors.error} />
              </Pressable>
            )
          )}
          <Icon font="Ionicons" icon="chevron-forward" size={20} color={theme.colors.textDim} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const $listItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $listActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $deleteButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
})

const $itemContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
})

const $iconBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: colors.palette.overlay10,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.sm,
})

const $textContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
  marginTop: spacing.xxs,
})
