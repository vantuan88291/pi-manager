import { FC } from 'react'
import { View, ViewStyle, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import CodeEditor from '@uiw/react-textarea-code-editor'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Icon } from '@/components/Icon'
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
  const { content, loading, saving, error, hasChanges, handleSave, handleBack, setContent } =
    useFileEditor({ filePath, fileName })

  const isDark = theme.isDark
  const editorBgColor = isDark ? '#1e293b' : '#f8fafc'
  const editorColor = isDark ? '#e2e8f0' : '#1e293b'

  const saveButtonText = saving ? t('fileEditor:saving') : hasChanges ? t('common:save') : ''

  const handleBackPress = () => {
    if (hasChanges) {
      Alert.alert(
        t('fileEditor:unsavedChanges'),
        t('fileEditor:discardChanges'),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('common:delete'),
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } else {
      navigation.goBack()
    }
  }

  const handleSavePress = () => {
    if (!hasChanges) {
      navigation.goBack()
      return
    }

    handleSave()
  }

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
          <View style={$centered}>
            <Icon font="Ionicons" icon="hourglass" size={32} color={theme.colors.textDim} />
          </View>
        ) : error ? (
          <View style={$centered}>
            <Icon font="Ionicons" icon="alert-circle" size={32} color={theme.colors.error} />
          </View>
        ) : (
          <View style={themed([$editorWrapper, { backgroundColor: editorBgColor }])}>
            <CodeEditor
              value={content}
              language={getLanguageFromExtension(fileName)}
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
    </Screen>
  )
}

/**
 * Get language from file extension for syntax highlighting
 */
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
    env: 'shell',
    log: 'text',
    txt: 'text',
  }
  return languageMap[ext || ''] || 'text'
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

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: 40,
  alignItems: 'center',
})
