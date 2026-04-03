import { FC } from "react"
import { ActivityIndicator, View, ViewStyle, ScrollView } from "react-native"
import { useTranslation } from "react-i18next"

import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { QuickAccessPath } from "../../../shared/types/file-manager"

export interface FileManagerHeaderProps {
  currentPath: string
  quickAccessPaths: QuickAccessPath[]
  uploading?: boolean
  onGoUp: () => void
  onQuickAccess: (path: QuickAccessPath) => void
  onCreateFolder: () => void
  onCreateFile: () => void
  onUpload: () => void
}

export const FileManagerHeader: FC<FileManagerHeaderProps> = ({
  currentPath,
  quickAccessPaths,
  uploading = false,
  onGoUp,
  onQuickAccess,
  onCreateFile,
  onCreateFolder,
  onUpload,
}) => {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const home = process.env.HOME
  const goUpDisabled = currentPath === "/" || (!!home && currentPath === home)

  return (
    <View>
      <View style={themed($breadcrumb)}>
        <Button
          preset="default"
          onPress={onGoUp}
          disabled={goUpDisabled || uploading}
          style={themed($breadcrumbUpBtn)}
        >
          <Icon font="Ionicons" icon="arrow-up" size={16} />
        </Button>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={$breadcrumbScroll}
          contentContainerStyle={$breadcrumbScrollContent}
        >
          <Text size="sm" color="textDim">
            {currentPath}
          </Text>
        </ScrollView>
      </View>

      {quickAccessPaths.length > 0 && (
        <View style={themed($quickAccess)}>
          <Text size="xs" weight="semiBold" color="textDim" style={themed($quickAccessTitle)}>
            {t("fileManager:quickAccess")}
          </Text>
          <View style={$quickAccessList}>
            {quickAccessPaths.map((pathObj) => (
              <Button
                key={pathObj.path}
                preset="default"
                onPress={() => onQuickAccess(pathObj)}
                disabled={uploading}
                style={themed($quickAccessChip)}
              >
                <Icon font="Ionicons" icon="bookmark" size={14} color={theme.colors.tint} />
                <Text
                  size="xs"
                  weight="medium"
                  style={themed($quickAccessChipLabel)}
                  text={pathObj.label}
                />
              </Button>
            ))}
          </View>
        </View>
      )}

      <SectionHeader
        titleTx="fileManager:sectionFiles"
        rightAction={
          <View style={themed($headerActions)}>
            <Button
              preset="default"
              onPress={onCreateFolder}
              disabled={uploading}
              style={themed($headerActionBtn)}
            >
              <Icon font="Ionicons" icon="folder" size={18} />
            </Button>
            <Button
              preset="default"
              onPress={onCreateFile}
              disabled={uploading}
              style={themed($headerActionBtn)}
            >
              <Icon font="Ionicons" icon="document" size={18} />
            </Button>
            <Button
              preset="default"
              onPress={onUpload}
              disabled={uploading}
              style={themed($headerActionBtn)}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.tint} />
              ) : (
                <Icon font="Ionicons" icon="cloud-upload" size={18} />
              )}
            </Button>
          </View>
        }
      />
    </View>
  )
}

const $breadcrumb: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.surface,
  padding: spacing.sm,
  borderRadius: 12,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
})

const $breadcrumbUpBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
})

const $breadcrumbScroll: ViewStyle = {
  flex: 1,
}

const $breadcrumbScrollContent: ViewStyle = {
  flexGrow: 1,
}

const $quickAccess: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $quickAccessTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $quickAccessList: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
}

const $quickAccessChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginRight: spacing.xs,
  marginBottom: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
})

const $quickAccessChipLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xxs,
})

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xxs,
})

const $headerActionBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xxs,
})
