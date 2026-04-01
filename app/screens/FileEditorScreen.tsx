import { FC, useState, useEffect, useCallback, useRef } from 'react'
import { View, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import CodeEditor from '@uiw/react-textarea-code-editor'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Icon } from '@/components/Icon'
import { AlertModal, type AlertButton } from '@/components/AlertModal'
import { useAppTheme } from '@/theme/context'
import type { ThemedStyle } from '@/theme/types'
import type { AppStackParamList } from '@/navigators/navigationTypes'
import { useSocket } from '@/services/socket/SocketContext'
import { fileManagerClientModule } from '@/services/socket/modules/file-manager'

type FileEditorScreenRouteProps = import('@react-navigation/native').RouteProp<AppStackParamList, 'FileEditor'>
type FileEditorScreenNavProps = import('@react-navigation/native').NativeStackNavigationProp<AppStackParamList, 'FileEditor'>

interface RouteProps {
  params: { filePath: string; fileName: string }
}

const getLanguageFromExtension = (filename: string): string => {
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

export const FileEditorScreen: FC = function FileEditorScreen() {
  const navigation = useNavigation<FileEditorScreenNavProps>()
  const route = useRoute<RouteProps>()
  const { t } = useTranslation()
  const { theme } = useAppTheme()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const { filePath, fileName } = route.params
  const language = getLanguageFromExtension(fileName)
  
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const hasChangesRef = useRef(false)
  const originalContentRef = useRef('')
  const fileLoadedRef = useRef(false)
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: '', buttons: [] })

  // Stable callback for file read - won't change between renders
  const handleFileRead = useCallback((result: { success: boolean; data?: { content: string }; error?: string }) => {
    if (fileLoadedRef.current) return // Prevent duplicate calls
    
    setLoading(false)
    fileLoadedRef.current = true
    
    if (result.success && result.data) {
      setContent(result.data.content)
      originalContentRef.current = result.data.content
      hasChangesRef.current = false
    } else {
      setAlertConfig({ 
        visible: true, 
        title: 'Error', 
        message: result.error || 'Failed to read file',
        buttons: [{ text: 'OK' }]
      })
    }
  }, [])

  // Stable callback for file write
  const handleFileWrite = useCallback((result: { success: boolean; error?: string }) => {
    setSaving(false)
    if (result.success) {
      originalContentRef.current = content
      hasChangesRef.current = false
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'File saved successfully!',
        buttons: [{ text: 'OK', onPress: () => navigation.goBack() }]
      })
    } else {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to save file',
        buttons: [{ text: 'OK' }]
      })
    }
  }, [content, navigation])

  // Register callbacks ONCE on mount
  useEffect(() => {
    const unsubRead = fileManagerClientModule.onRead(handleFileRead)
    const unsubWrite = fileManagerClientModule.onWrite(handleFileWrite)
    
    // Load file content
    fileManagerClientModule.readFile(filePath)
    
    return () => {
      unsubRead()
      unsubWrite()
      unsubscribeFromModule('file-manager')
    }
  }, [filePath, handleFileRead, handleFileWrite, subscribeToModule, unsubscribeFromModule])

  const handleSave = () => {
    if (!hasChangesRef.current) {
      navigation.goBack()
      return
    }
    
    setSaving(true)
    fileManagerClientModule.writeFile(filePath, content)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    hasChangesRef.current = newContent !== originalContentRef.current
  }

  const handleBack = () => {
    if (hasChangesRef.current) {
      setAlertConfig({
        visible: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Discard them?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      })
    } else {
      navigation.goBack()
    }
  }

  const isDark = theme.isDark
  const editorBgColor = isDark ? '#1e293b' : '#f8fafc'
  const editorColor = isDark ? '#e2e8f0' : '#1e293b'

  const hasChanges = hasChangesRef.current
  const saveButtonText = saving ? 'Saving...' : (hasChanges ? 'Save' : '')

  return (
    <Screen preset="scroll">
      <Header 
        titleTx="fileEditor:title" 
        leftIcon="back" 
        onLeftPress={handleBack}
        rightText={saveButtonText}
        onRightPress={handleSave}
        disabled={saving || !hasChanges}
      />
      
      <View style={themed($editorContainer)}>
        {loading ? (
          <View style={$centered}>
            <Icon font="Ionicons" icon="hourglass" size={32} color={theme.colors.textDim} />
          </View>
        ) : (
          <View style={themed([$editorWrapper, { backgroundColor: editorBgColor }])}>
            <CodeEditor
              value={content}
              language={language}
              placeholder="File content..."
              onChange={handleContentChange}
              padding={16}
              style={{
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                fontSize: 14,
                backgroundColor: 'transparent',
                color: editorColor,
                minHeight: 400,
              }}
            />
          </View>
        )}
      </View>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
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
})

const $centered: ViewStyle = {
  padding: 40,
  alignItems: 'center',
}
