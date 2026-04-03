import { FC } from "react"
import { View, ViewStyle } from "react-native"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Icon } from "@/components/Icon"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { FileInfo } from "../../../shared/types/file-manager"
import { FileManagerFileListItem } from "./FileManagerFileListItem"

export interface FileManagerListBodyProps {
  error: string | null
  loading: boolean
  items: FileInfo[]
  onItemPress: (item: FileInfo) => void
  onItemLongPress: (item: FileInfo) => void
  onItemDelete: (item: FileInfo) => void
}

export const FileManagerListBody: FC<FileManagerListBodyProps> = ({
  error,
  loading,
  items,
  onItemPress,
  onItemLongPress,
  onItemDelete,
}) => {
  const { themed, theme } = useAppTheme()

  if (!!error) {
    return (
      <Card style={themed($errorCard)}>
        <Text color="error">{error}</Text>
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={themed($centered)}>
        <Text color="textDim" tx="fileManager:loading" />
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={themed($emptyState)}>
        <Icon font="Ionicons" icon="folder-open" size={64} color={theme.colors.textDim} />
        <Text
          weight="semiBold"
          size="md"
          color="textDim"
          style={themed($emptyTitle)}
          tx="fileManager:empty"
        />
      </View>
    )
  }

  return (
    <View>
      {items.map((item, index) => (
        <View key={item.path}>
          <FileManagerFileListItem
            item={item}
            onPress={onItemPress}
            onLongPress={onItemLongPress}
            onDelete={onItemDelete}
          />
          {index < items.length - 1 && <View style={themed($separator)} />}
        </View>
      ))}
    </View>
  )
}

const $errorCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error + "10",
  borderColor: colors.error + "30",
  padding: spacing.md,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl * 2,
  alignItems: "center",
  justifyContent: "center",
})

const $emptyTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
})

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginHorizontal: spacing.md,
})
