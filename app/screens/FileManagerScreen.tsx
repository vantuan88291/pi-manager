import { FC, useState, useEffect } from 'react'
import { View, ViewStyle, RefreshControl, ScrollView, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

import { Header } from '@/components/Header'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { ListItem } from '@/components/ListItem'
import { AlertModal, type AlertButton } from '@/components/AlertModal'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'
import { useAppTheme } from '@/theme/context'
import type { ThemedStyle } from '@/theme/types'
import type { AppStackParamList } from '@/navigators/navigationTypes'
import { useSocket } from '@/services/socket/SocketContext'
import { fileManagerClientModule } from '@/services/socket/modules/file-manager'
import type { FileInfo, QuickAccessPath } from '../../shared/types/file-manager'
import { QUICK_ACCESS_PATHS } from '../../shared/types/file-manager'

type FileManagerScreenProps = import('@react-navigation/native').NativeStackScreenProps<AppStackParamList, 'FileManager'>

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatModifiedTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

const getFileIcon = (file: FileInfo): { font: 'Ionicons' | 'MaterialCommunityIcons'; name: string; color: string } => {
  if (file.type === 'directory') {
    return { font: 'Ionicons', name: 'folder', color: '#F59E0B' }
  }
  
  const ext = file.extension?.toLowerCase()
  if (['js', 'ts', 'tsx', 'jsx'].includes(ext || '')) {
    return { font: 'Ionicons', name: 'code-slash', color: '#6366F1' }
  }
  if (['json', 'yml', 'yaml', 'xml'].includes(ext || '')) {
    return { font: 'Ionicons', name: 'document-text', color: '#10B981' }
  }
  if (['md', 'txt'].includes(ext || '')) {
    return { font: 'Ionicons', name: 'document-outline', color: '#3B82F6' }
  }
  if (['log'].includes(ext || '')) {
    return { font: 'Ionicons', name: 'bug', color: '#EF4444' }
  }
  if (['sh', 'py', 'env'].includes(ext || '')) {
    return { font: 'Ionicons', name: 'terminal', color: '#8B5CF6' }
  }
  
  return { font: 'Ionicons', name: 'document-outline', color: '#6B7280' }
}

interface FileListItemProps {
  item: FileInfo
  onPress: (item: FileInfo) => void
  onLongPress?: (item: FileInfo) => void
  onDelete?: (item: FileInfo) => void
}

const FileListItem: FC<FileListItemProps> = ({ item, onPress, onLongPress, onDelete }) => {
  const { themed, theme } = useAppTheme()
  const icon = getFileIcon(item)
  
  return (
    <View 
      style={themed($listItem)}
      onStartShouldSetResponder={() => true}
      onResponderRelease={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
    >
      <View style={$itemContent}>
        <View style={themed($iconBadge)}>
          <Icon font={icon.font} icon={icon.name} color={icon.color} size={24} />
        </View>
        <View style={$textContainer}>
          <Text weight="medium" size="sm" color="text" numberOfLines={1}>
            {item.name}
          </Text>
          <View style={$metaRow}>
            {item.type === 'file' && (
              <>
                <Text size="xs" color="textDim">{formatFileSize(item.size)}</Text>
                <Text size="xs" color="textDim">•</Text>
                <Text size="xs" color="textDim">{formatModifiedTime(item.modified)}</Text>
              </>
            )}
            {item.type === 'directory' && (
              <Text size="xs" color="textDim">Folder</Text>
            )}
          </View>
        </View>
        <View style={$listActions}>
          {onDelete && (
            <Pressable
              onPress={() => onDelete(item)}
              style={themed($deleteButton)}
            >
              <Icon font="Ionicons" icon="trash" size={18} color={theme.colors.error} />
            </Pressable>
          )}
          <Icon font="Ionicons" icon="chevron-forward" size={20} color={theme.colors.textDim} />
        </View>
      </View>
    </View>
  )
}

export const FileManagerScreen: FC<FileManagerScreenProps> = function FileManagerScreen() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const [currentPath, setCurrentPath] = useState('/home/vantuan88291')
  const [items, setItems] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [quickAccessPaths] = useState<QuickAccessPath[]>(QUICK_ACCESS_PATHS)
  const [error, setError] = useState<string | null>(null)
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: '', buttons: [] })

  const [actionMenu, setActionMenu] = useState<{
    visible: boolean
    item: FileInfo | null
  }>({ visible: false, item: null })

  useEffect(() => {
    console.log('[FileManager] useEffect - currentPath:', currentPath)
    subscribeToModule('file-manager')
    
    const unsubList = fileManagerClientModule.onList((result) => {
      console.log('[FileManager] onList callback - items:', result.items?.length, 'error:', result.error)
      if (result.error) {
        console.error('[FileManager] Error:', result.error)
        setError(result.error)
      } else {
        console.log('[FileManager] Setting items:', result.items?.map(i => i.name).join(', '))
        setItems(result.items || [])
        setError(null)
      }
      setLoading(false)
      setRefreshing(false)
    })
    
    const unsubDelete = fileManagerClientModule.onDelete((result) => {
      if (result.success) {
        // Refresh current directory
        fileManagerClientModule.listDirectory(currentPath)
        showAlert('Success', result.message || 'Deleted successfully')
      } else {
        showAlert('Error', result.error || 'Failed to delete')
      }
    })
    
    // Request quick access paths
    console.log('[FileManager] Requesting quick access...')
    fileManagerClientModule.requestQuickAccess()
    
    // List current directory immediately
    console.log('[FileManager] Calling listDirectory:', currentPath)
    fileManagerClientModule.listDirectory(currentPath)
    
    return () => {
      console.log('[FileManager] cleanup')
      unsubList()
      unsubscribeFromModule('file-manager')
    }
  }, [subscribeToModule, unsubscribeFromModule, currentPath])

  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fileManagerClientModule.listDirectory(currentPath)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleNavigate = (item: FileInfo) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path)
      setLoading(true)
      fileManagerClientModule.listDirectory(item.path)
    } else {
      // Navigate to file editor
      navigation.navigate('FileEditor', {
        filePath: item.path,
        fileName: item.name,
      })
    }
  }

  const handleLongPress = (item: FileInfo) => {
    setActionMenu({ visible: true, item })
  }

  const handleDelete = (item: FileInfo) => {
    showAlert(
      t('fileManager:deleteConfirm', { name: item.name }),
      t('fileManager:deleteWarning'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: () => {
            fileManagerClientModule.deleteFileOrFolder(item.path)
          },
        },
      ]
    )
  }

  const handleGoUp = () => {
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/'))
    if (parent) {
      setCurrentPath(parent)
      setLoading(true)
      fileManagerClientModule.listDirectory(parent)
    }
  }

  const handleQuickAccess = (pathObj: QuickAccessPath) => {
    setCurrentPath(pathObj.path)
    setLoading(true)
    fileManagerClientModule.listDirectory(pathObj.path)
  }

  const renderHeader = () => (
    <View>
      {/* Breadcrumb */}
      <View style={themed($breadcrumb)}>
        <Button
          preset="default"
          size="sm"
          onPress={handleGoUp}
          disabled={currentPath === '/' || currentPath === process.env.HOME}
          style={{ marginRight: 8 }}
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

      {/* Quick Access */}
      {quickAccessPaths.length > 0 && (
        <View style={themed($quickAccess)}>
          <Text size="xs" weight="semiBold" color="textDim" style={{ marginBottom: 8 }}>
            Quick Access
          </Text>
          <View style={$quickAccessList}>
            {quickAccessPaths.map((pathObj) => (
              <Button
                key={pathObj.path}
                preset="default"
                size="sm"
                onPress={() => handleQuickAccess(pathObj)}
                style={{ marginRight: 8, marginBottom: 8, borderColor: theme.colors.border, borderWidth: 1 }}
              >
                <Icon font="Ionicons" icon="bookmark" size={14} color={theme.colors.tint} />
                <Text size="xs" weight="medium" style={{ marginLeft: 4 }}>{pathObj.label}</Text>
              </Button>
            ))}
          </View>
        </View>
      )}

      {/* Section Header */}
      <SectionHeader
        title="Files"
        rightAction={
          <Button
            preset="default"
            size="sm"
            onPress={handleRefresh}
            disabled={loading}
          >
            <Icon font="Ionicons" icon="refresh" size={16} />
          </Button>
        }
      />
    </View>
  )

  return (
    <Screen
      preset="scroll"
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
      }}
    >
      <Header titleTx="fileManager:title" leftIcon="back" onLeftPress={() => navigation.goBack()} />
      
      <View style={themed($contentWrapper)}>
        {renderHeader()}
        
        {error ? (
          <Card style={themed($errorCard)}>
            <Text color="error">{error}</Text>
          </Card>
        ) : loading ? (
          <View style={themed($centered)}>
            <Text color="textDim">Loading...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={themed($emptyState)}>
            <Icon font="Ionicons" icon="folder-open" size={64} color={theme.colors.textDim} />
            <Text weight="semiBold" size="md" color="textDim" style={{ marginTop: 16 }}>
              This folder is empty
            </Text>
          </View>
        ) : (
          <View>
            {console.log('[FileManager] Rendering items:', items.length)}
            {items.map((item, index) => (
              <View key={item.path}>
                <FileListItem
                  item={item}
                  onPress={handleNavigate}
                  onLongPress={handleLongPress}
                  onDelete={handleDelete}
                />
                {index < items.length - 1 && <View style={themed($separator)} />}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Menu Modal */}
      <AlertModal
        visible={actionMenu.visible && !!actionMenu.item}
        title={actionMenu.item?.name || ''}
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setActionMenu({ visible: false, item: null }) },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
        ]}
        onClose={() => setActionMenu({ visible: false, item: null })}
      />

      {/* Generic Alert */}
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

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
})

const $breadcrumb: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  padding: spacing.sm,
  borderRadius: 12,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
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

const $quickAccessList: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
}

const $listItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $listActions: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}

const $deleteButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
})

const $itemContent: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}

const $iconBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: 'rgba(0,0,0,0.05)',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.sm,
})

const $textContainer: ViewStyle = {
  flex: 1,
}

const $metaRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 4,
}

const $errorCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error + '10',
  borderColor: colors.error + '30',
  padding: spacing.md,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl * 2,
  alignItems: 'center',
  justifyContent: 'center',
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: 'center',
})

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginHorizontal: spacing.md,
})
