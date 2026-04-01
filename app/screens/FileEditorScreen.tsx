import { FC, useState, useEffect, useCallback, useRef } from 'react'
import { View, ViewStyle, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import CodeEditor from '@uiw/react-textarea-code-editor'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
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
  const { themed, theme } = useAppTheme()
  const { socket } = useSocket()
  
  const { filePath, fileName } = route.params
  const language = getLanguageFromExtension(fileName)
  
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const callbackRegisteredRef = useRef(false)
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: '', buttons: [] })

  const addLog = useCallback((msg: string) => {
    console.log('[FileEditor]', msg)
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10))
  }, [])

  // Handle file read - stable callback
  const handleFileRead = useCallback((result: { success: boolean; data?: { content: string }; error?: string }) => {
    addLog(`handleFileRead called: success=${result.success}, length=${result.data?.content?.length || 0}`)
    
    if (result.success && result.data) {
      setContent(result.data.content)
      setError(null)
      addLog('✅ File loaded successfully')
    } else {
      setError(result.error || 'Failed to read file')
      addLog(`❌ Error: ${result.error}`)
      setAlertConfig({ 
        visible: true, 
        title: 'Error', 
        message: result.error || 'Failed to read file',
        buttons: [{ text: 'OK' }]
      })
    }
    
    setLoading(false)
  }, [addLog])

  // Handle file write
  const handleFileWrite = useCallback((result: { success: boolean; error?: string }) => {
    setSaving(false)
    if (result.success) {
      addLog('✅ File saved successfully')
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'File saved successfully!',
        buttons: [{ text: 'OK', onPress: () => navigation.goBack() }]
      })
    } else {
      addLog(`❌ Save error: ${result.error}`)
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to save file',
        buttons: [{ text: 'OK' }]
      })
    }
  }, [navigation, addLog])

  // Register callbacks and load file
  useEffect(() => {
    addLog(`=== Opening file: ${filePath} ===`)
    addLog(`Language: ${language}`)
    addLog(`Socket connected: ${socket?.connected}`)
    
    // Reset state for new file
    callbackRegisteredRef.current = false
    setContent('')
    setLoading(true)
    setError(null)
    
    // Register callback ONCE
    const unsubRead = fileManagerClientModule.onRead((result) => {
      addLog('onRead callback triggered')
      callbackRegisteredRef.current = true
      handleFileRead(result)
    })
    
    const unsubWrite = fileManagerClientModule.onWrite(handleFileWrite)
    
    addLog('Callbacks registered')
    
    // Small delay to ensure callback is ready
    setTimeout(() => {
      addLog('Calling readFile...')
      fileManagerClientModule.readFile(filePath)
      
      // Timeout to detect if no response
      const timeoutId = setTimeout(() => {
        if (loading && !callbackRegisteredRef.current) {
          addLog('⚠️ Timeout: No response from readFile')
          addLog('Retrying...')
          fileManagerClientModule.readFile(filePath)
        }
      }, 3000)
      
      return () => clearTimeout(timeoutId)
    }, 100)
    
    // Cleanup
    return () => {
      addLog('Cleanup')
      unsubRead()
      unsubWrite()
    }
  }, [filePath, language, socket?.connected, handleFileRead, handleFileWrite, loading, addLog])

  const hasChanges = content.length > 0
  
  const handleSave = () => {
    addLog('Save pressed')
    setSaving(true)
    fileManagerClientModule.writeFile(filePath, content)
  }

  const handleBack = () => {
    if (hasChanges && !loading) {
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

  const saveButtonText = saving ? 'Saving...' : (hasChanges ? 'Save' : '')

  return (
    <Screen preset="scroll">
      <Header 
        titleTx="fileEditor:title" 
        leftIcon="back" 
        onLeftPress={handleBack}
        rightText={saveButtonText}
        onRightPress={handleSave}
        disabled={saving || loading}
      />
      
      <View style={themed($editorContainer)}>
        {loading ? (
          <View style={$centered}>
            <Icon font="Ionicons" icon="hourglass" size={32} color={theme.colors.textDim} />
            <Text color="textDim" style={{ marginTop: 16 }}>Loading file...</Text>
            <Text color="textDim" size="xs" style={{ marginTop: 8 }}>Socket: {socket?.connected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        ) : error ? (
          <View style={$centered}>
            <Icon font="Ionicons" icon="alert-circle" size={32} color={theme.colors.error} />
            <Text color="error" style={{ marginTop: 16 }}>{error}</Text>
          </View>
        ) : (
          <View style={themed([$editorWrapper, { backgroundColor: editorBgColor }])}>
            <CodeEditor
              key={`editor-${filePath}`}
              value={content}
              language={language}
              placeholder="File content..."
              onChange={(e) => setContent(e.target.value)}
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

        {/* Debug Logs Panel */}
        <View style={themed($debugPanel)}>
          <Text weight="semiBold" size="xs" color="textDim" style={{ marginBottom: 8 }}>
            Debug Logs:
          </Text>
          <ScrollView style={$logScrollView} nestedScrollEnabled={true}>
            {debugLogs.map((log, i) => (
              <Text key={i} size="xs" color="textDim" style={{ marginBottom: 4 }}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
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
  marginBottom: spacing.md,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: 40,
  alignItems: 'center',
})

const $debugPanel: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.input,
  borderRadius: 8,
  padding: spacing.sm,
  maxHeight: 200,
})

const $logScrollView: ViewStyle = {
  maxHeight: 150,
}
