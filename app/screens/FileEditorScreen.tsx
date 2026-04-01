import { FC, useState, useEffect } from 'react'
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

type FileEditorScreenRouteProps = import('@react-navigation/native').RouteProp<AppStackParamList, 'FileEditor'>
type FileEditorScreenNavProps = import('@react-navigation/native').NativeStackNavigationProp<AppStackParamList, 'FileEditor'>

interface RouteProps {
  params: { filePath: string; fileName: string }
}

interface FileReadResponse {
  success: boolean
  data?: {
    path: string
    content: string
    size: number
    modified: number
    language: string
  }
  error?: string
}

export const FileEditorScreen: FC = function FileEditorScreen() {
  const navigation = useNavigation<FileEditorScreenNavProps>()
  const route = useRoute<RouteProps>()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  
  const { filePath, fileName } = route.params
  
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: '', buttons: [] })

  // Load file content using REST API
  useEffect(() => {
    let isMounted = true
    
    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
        const result: FileReadResponse = await response.json()
        
        if (!isMounted) return
        
        if (result.success && result.data) {
          setContent(result.data.content)
        } else {
          setError(result.error || 'Failed to read file')
          setAlertConfig({
            visible: true,
            title: 'Error',
            message: result.error || 'Failed to read file',
            buttons: [{ text: 'OK' }]
          })
        }
      } catch (err: any) {
        if (!isMounted) return
        setError(err.message || 'Network error')
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: err.message || 'Network error',
          buttons: [{ text: 'OK' }]
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadFile()
    
    return () => {
      isMounted = false
    }
  }, [filePath])

  const hasChanges = content.length > 0
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
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
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: err.message || 'Network error',
        buttons: [{ text: 'OK' }]
      })
    } finally {
      setSaving(false)
    }
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
