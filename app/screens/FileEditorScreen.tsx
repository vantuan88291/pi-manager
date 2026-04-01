import { FC, useState, useEffect } from 'react'
import { View, ViewStyle, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import CodeEditor from '@uiw/react-textarea-code-editor'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { AlertModal, type AlertButton } from '@/components/AlertModal'
import { useAppTheme } from '@/theme/context'
import type { ThemedStyle } from '@/theme/types'
import type { AppStackParamList } from '@/navigators/navigationTypes'
import { useSocket } from '@/services/socket/SocketContext'
import { fileManagerClientModule } from '@/services/socket/modules/file-manager'

type FileEditorScreenRouteProps = import('@react-navigation/native').RouteProp<AppStackParamList, 'FileEditor'>
type FileEditorScreenNavProps = import('@react-navigation/native').NativeStackNavigationProp<AppStackParamList, 'FileEditor'>

interface FileEditorScreenParams {
  filePath: string
  fileName: string
}

interface RouteProps {
  params: FileEditorScreenParams
}

const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'py': 'python',
    'sh': 'shell',
    'bash': 'shell',
    'env': 'shell',
    'log': 'text',
    'txt': 'text',
  }
  return languageMap[ext || ''] || 'text'
}

export const FileEditorScreen: FC = function FileEditorScreen() {
  const navigation = useNavigation<FileEditorScreenNavProps>()
  const route = useRoute<RouteProps>()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const { filePath, fileName } = route.params
  const language = getLanguageFromExtension(fileName)
  
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalContent, setOriginalContent] = useState('')
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: '', buttons: [] })

  useEffect(() => {
    subscribeToModule('file-manager')
    
    const unsubRead = fileManagerClientModule.onRead((result) => {
      setLoading(false)
      if (result.success && result.data) {
        setContent(result.data.content)
        setOriginalContent(result.data.content)
      } else {
        showAlert('Error', result.error || 'Failed to read file')
      }
    })
    
    const unsubWrite = fileManagerClientModule.onWrite((result) => {
      setSaving(false)
      if (result.success) {
        setOriginalContent(content)
        setHasChanges(false)
        showAlert('Success', 'File saved successfully!', [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ])
      } else {
        showAlert('Error', result.error || 'Failed to save file')
      }
    })
    
    // Load file content
    fileManagerClientModule.readFile(filePath)
    
    return () => {
      unsubRead()
      unsubWrite()
      unsubscribeFromModule('file-manager')
    }
  }, [filePath, subscribeToModule, unsubscribeFromModule, navigation])

  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }

  const handleSave = () => {
    if (!hasChanges) {
      navigation.goBack()
      return
    }
    
    setSaving(true)
    fileManagerClientModule.writeFile(filePath, content)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasChanges(newContent !== originalContent)
  }

  const handleBack = () => {
    if (hasChanges) {
      showAlert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } else {
      navigation.goBack()
    }
  }

  const isDark = theme.isDark
  const editorBgColor = isDark ? '#1e293b' : '#f8fafc'
  const editorColor = isDark ? '#e2e8f0' : '#1e293b'

  return (
    <Screen preset="scroll">
      <Header 
        titleTx="fileEditor:title" 
        leftIcon="back" 
        onLeftPress={handleBack}
        rightIcon="save"
        rightIconColor={hasChanges ? theme.colors.tint : theme.colors.textDim}
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
              onChange={(e) => handleContentChange(e.target.value)}
              padding={16}
              style={{
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                fontSize: 14,
                backgroundColor: 'transparent',
                color: editorColor,
                minHeight: 400,
              }}
              onPaste={() => console.log('paste')}
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
