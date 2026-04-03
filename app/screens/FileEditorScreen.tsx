import { FC, useMemo } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import CodeEditor from "@uiw/react-textarea-code-editor"
import { useTranslation } from "react-i18next"

import { AlertModal, type AlertButton } from "@/components/AlertModal"
import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useFileEditor } from "@/hooks/useFileEditor"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export const FileEditorScreen: FC = function FileEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, "FileEditor">>()
  const route = useRoute<RouteProp<AppStackParamList, "FileEditor">>()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()

  const { filePath, fileName } = route.params

  const {
    content,
    loading,
    saving,
    error,
    hasChanges,
    isMediaFile,
    mediaType,
    language,
    handleSave,
    setContent,
    handleBack,
    showDiscardModal,
    setShowDiscardModal,
  } = useFileEditor({ filePath, fileName })

  const isDark = theme.isDark
  const editorBgColor = isDark ? "#1e293b" : "#f8fafc"
  const editorColor = isDark ? "#e2e8f0" : "#1e293b"

  const saveButtonText = saving ? t("fileEditor:saving") : hasChanges ? t("common:save") : ""

  const codeEditorStyle = useMemo(
    () =>
      ({
        fontFamily: "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        fontSize: 13,
        backgroundColor: "transparent",
        color: editorColor,
        minHeight: 500,
        lineHeight: 1.5,
      }) satisfies TextStyle,
    [editorColor],
  )

  const handleBackPress = () => {
    handleBack(() => navigation.goBack())
  }

  const handleSavePress = () => {
    if (!hasChanges) {
      navigation.goBack()
      return
    }

    handleSave()
  }

  const handleDiscardConfirm = () => {
    setShowDiscardModal(false)
    navigation.goBack()
  }

  const discardModalButtons: AlertButton[] = [
    {
      text: t("common:cancel"),
      style: "cancel",
      onPress: () => setShowDiscardModal(false),
    },
    {
      text: t("fileEditor:discard"),
      style: "destructive",
      onPress: handleDiscardConfirm,
    },
  ]

  if (isMediaFile && mediaType) {
    return (
      <Screen preset="scroll">
        <Header titleTx="fileEditor:title" leftIcon="back" onLeftPress={handleBackPress} />

        <View style={themed($mediaContainer)}>
          {mediaType === "image" && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="image" size={80} color={theme.colors.tint} />
              <Text
                weight="semiBold"
                size="lg"
                color="text"
                style={themed($mediaTitle)}
                text={fileName}
              />
              <Text
                color="textDim"
                size="sm"
                style={themed($mediaSubtitle)}
                tx="fileEditor:imagePreviewCaption"
              />
            </View>
          )}

          {mediaType === "video" && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="videocam" size={80} color={theme.colors.warning} />
              <Text
                weight="semiBold"
                size="lg"
                color="text"
                style={themed($mediaTitle)}
                text={fileName}
              />
              <Text
                color="textDim"
                size="sm"
                style={themed($mediaSubtitle)}
                tx="fileEditor:videoNotAvailable"
              />
            </View>
          )}

          {mediaType === "audio" && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="musical-notes" size={80} color={theme.colors.success} />
              <Text
                weight="semiBold"
                size="lg"
                color="text"
                style={themed($mediaTitle)}
                text={fileName}
              />
              <Text
                color="textDim"
                size="sm"
                style={themed($mediaSubtitle)}
                tx="fileEditor:audioNotAvailable"
              />
            </View>
          )}
        </View>

        <AlertModal
          visible={showDiscardModal}
          title={t("fileEditor:unsavedChanges")}
          message={t("fileEditor:discardChanges")}
          buttons={discardModalButtons}
          onClose={() => setShowDiscardModal(false)}
        />
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <Header
        titleTx="fileEditor:title"
        leftIcon="back"
        onLeftPress={handleBackPress}
        rightText={saveButtonText}
        onRightPress={handleSavePress}
      />

      <View style={themed($editorContainer)}>
        {loading ? (
          <View style={themed($loadingContainer)}>
            <Icon font="Ionicons" icon="hourglass" size={48} color={theme.colors.tint} />
            <Text color="textDim" style={themed($loadingCaption)} tx="common:loading" />
          </View>
        ) : error ? (
          <View style={themed($centered)}>
            <Icon font="Ionicons" icon="alert-circle" size={32} color={theme.colors.error} />
          </View>
        ) : (
          <View style={themed([$editorWrapper, { backgroundColor: editorBgColor }])}>
            <CodeEditor
              value={content}
              language={language}
              onChange={(e) => setContent(e.target.value)}
              padding={16}
              style={codeEditorStyle}
            />
          </View>
        )}
      </View>

      <AlertModal
        visible={showDiscardModal}
        title={t("fileEditor:unsavedChanges")}
        message={t("fileEditor:discardChanges")}
        buttons={discardModalButtons}
        onClose={() => setShowDiscardModal(false)}
      />
    </Screen>
  )
}

const $editorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
})

const $editorWrapper: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
  marginBottom: spacing.md,
})

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  minHeight: 400,
  alignItems: "center",
  justifyContent: "center",
})

const $loadingCaption: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xl,
  alignItems: "center",
})

const $mediaContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.xl,
  alignItems: "center",
  justifyContent: "center",
})

const $mediaContent: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
}

const $mediaTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $mediaSubtitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})
