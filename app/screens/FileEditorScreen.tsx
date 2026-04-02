import { FC } from 'react'
import { View, ViewStyle, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import CodeEditor from '@uiw/react-textarea-code-editor'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { AlertModal, type AlertButton } from '@/components/AlertModal'
import { useFileEditor } from '@/hooks/useFileEditor'
import { useAppTheme } from '@/theme/context'
import type { ThemedStyle } from '@/theme/types'
import type { AppStackParamList } from '@/navigators/navigationTypes'

type FileEditorScreenRouteProps = import('@react-navigation/native').RouteProp<AppStackParamList, 'FileEditor'>
type FileEditorScreenNavProps = import('@react-navigation/native').NativeStackNavigationProp<AppStackParamList, 'FileEditor'>

interface RouteProps {
  params: { filePath: string; fileName: string }
}

export const FileEditorScreen: FC = function FileEditorScreen() {
  const navigation = useNavigation<FileEditorScreenNavProps>()
  const route = useRoute<RouteProps>()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()

  const { filePath, fileName } = route.params

  // Use custom hook for file editor logic
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
  const editorBgColor = isDark ? '#1e293b' : '#f8fafc'
  const editorColor = isDark ? '#e2e8f0' : '#1e293b'

  const saveButtonText = saving ? t('fileEditor:saving') : hasChanges ? t('common:save') : ''

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
      text: t('common:cancel'), 
      style: 'cancel',
      onPress: () => setShowDiscardModal(false) 
    },
    {
      text: t('fileEditor:discard'),
      style: 'destructive',
      onPress: handleDiscardConfirm,
    },
  ]

  // Render media preview
  if (isMediaFile && mediaType) {
    return (
      <Screen preset="scroll">
        <Header
          titleTx="fileEditor:title"
          leftIcon="back"
          onLeftPress={handleBackPress}
        />

        <View style={themed($mediaContainer)}>
          {mediaType === 'image' && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="image" size={80} color={theme.colors.tint} />
              <Text weight="semiBold" size="lg" color="text" style={{ marginTop: 16 }}>
                {fileName}
              </Text>
              <Text color="textDim" size="sm" style={{ marginTop: 8 }}>
                Image preview
              </Text>
            </View>
          )}
          
          {mediaType === 'video' && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="videocam" size={80} color={theme.colors.warning} />
              <Text weight="semiBold" size="lg" color="text" style={{ marginTop: 16 }}>
                {fileName}
              </Text>
              <Text color="textDim" size="sm" style={{ marginTop: 8 }}>
                Video preview not available
              </Text>
            </View>
          )}
          
          {mediaType === 'audio' && (
            <View style={$mediaContent}>
              <Icon font="Ionicons" icon="musical-notes" size={80} color={theme.colors.success} />
              <Text weight="semiBold" size="lg" color="text" style={{ marginTop: 16 }}>
                {fileName}
              </Text>
              <Text color="textDim" size="sm" style={{ marginTop: 8 }}>
                Audio preview not available
              </Text>
            </View>
          )}
        </View>

        {/* Discard changes modal */}
        <AlertModal
          visible={showDiscardModal}
          title={t('fileEditor:unsavedChanges')}
          message={t('fileEditor:discardChanges')}
          buttons={discardModalButtons}
          onClose={() => setShowDiscardModal(false)}
        />
      </Screen>
    )
  }

  // Render text editor
  return (
    <Screen preset="scroll">
      <Header
        titleTx="fileEditor:title"
        leftIcon="back"
        onLeftPress={handleBackPress}
        rightText={saveButtonText}
        onRightPress={handleSavePress}
        disabled={saving || loading}
      />

      <View style={themed($editorContainer)}>
        {loading ? (
          <View style={$loadingContainer}>
            <Icon font="Ionicons" icon="hourglass" size={48} color={theme.colors.tint} />
            <Text color="textDim" style={{ marginTop: 16 }}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={$centered}>
            <Icon font="Ionicons" icon="alert-circle" size={32} color={theme.colors.error} />
          </View>
        ) : (
          <View style={themed([$editorWrapper, { backgroundColor: editorBgColor }])}>
            <CodeEditor
              value={content}
              language={language}
              onChange={(e) => setContent(e.target.value)}
              padding={16}
              style={{
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                fontSize: 13,
                backgroundColor: 'transparent',
                color: editorColor,
                minHeight: 500,
                lineHeight: 1.5,
              }}
            />
          </View>
        )}
      </View>

      {/* Discard changes modal */}
      <AlertModal
        visible={showDiscardModal}
        title={t('fileEditor:unsavedChanges')}
        message={t('fileEditor:discardChanges')}
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
  overflow: 'hidden',
  marginBottom: spacing.md,
})

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  minHeight: 400,
  alignItems: 'center',
  justifyContent: 'center',
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: 40,
  alignItems: 'center',
})

const $mediaContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  padding: spacing.xl,
  alignItems: 'center',
  justifyContent: 'center',
})

const $mediaContent: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
