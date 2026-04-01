import { FC, useState, useEffect } from "react"
import { View, ViewStyle, RefreshControl } from "react-native"
import { useTranslation } from "react-i18next"
import { useNavigation } from "@react-navigation/native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { ProgressBar } from "@/components/ProgressBar"
import { AlertModal, type AlertButton } from "@/components/AlertModal"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useSocket } from "@/services/socket/SocketContext"
import { systemClientModule } from "@/services/socket/modules/system"
import type { ProcessInfo } from "../../shared/types/system"

type SystemControlScreenProps = import("@react-navigation/native").NativeStackScreenProps<AppStackParamList, "SystemControl">

interface ProcessListItemProps {
  process: ProcessInfo
  onKill: (process: ProcessInfo) => void
  disabled: boolean
}

const ProcessListItem: FC<ProcessListItemProps> = ({ process, onKill, disabled }) => {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()

  const cpuColor = process.cpu > 70 ? theme.colors.error : process.cpu > 40 ? theme.colors.warning : theme.colors.success
  const memColor = process.memory > 70 ? theme.colors.error : process.memory > 40 ? theme.colors.warning : theme.colors.success

  return (
    <View style={themed($processItem)}>
      <View style={$processInfo}>
        <View style={$processHeader}>
          <Text weight="semiBold" size="md" color="text" numberOfLines={1}>
            {process.name}
          </Text>
          <Button
            preset="reversed"
            size="sm"
            onPress={() => onKill(process)}
            disabled={disabled}
          >
            <Icon font="Ionicons" icon="close" size={16} color={theme.colors.error} />
          </Button>
        </View>
        
        <Text size="xs" color="textDim" numberOfLines={1} style={{ marginTop: 4 }}>
          PID: {process.pid} • {process.user}
        </Text>
        
        <Text size="xs" color="textDim" numberOfLines={2} style={{ marginTop: 6 }}>
          {process.command}
        </Text>

        {/* CPU Progress Bar */}
        <View style={themed($progressSection)}>
          <View style={$progressLabel}>
            <Text size="xs" weight="medium" color="text">CPU</Text>
            <Text size="xs" weight="semiBold" color={cpuColor}>{(process.cpu ?? 0).toFixed(1)}%</Text>
          </View>
          <ProgressBar
            progress={(process.cpu ?? 0) / 100}
            color={cpuColor}
            size="sm"
          />
        </View>

        {/* Memory Progress Bar */}
        <View style={themed($progressSection)}>
          <View style={$progressLabel}>
            <Text size="xs" weight="medium" color="text">RAM</Text>
            <Text size="xs" weight="semiBold" color={memColor}>{(process.memory ?? 0).toFixed(1)}%</Text>
          </View>
          <ProgressBar
            progress={(process.memory ?? 0) / 100}
            color={memColor}
            size="sm"
          />
        </View>
      </View>
    </View>
  )
}

export const SystemControlScreen: FC<SystemControlScreenProps> = function SystemControlScreen() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()

  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: "", buttons: [] })

  useEffect(() => {
    subscribeToModule("system")
    systemClientModule.requestProcessList()

    const unsub = systemClientModule.onProcesses((procs) => {
      setProcesses(procs)
      setLoading(false)
      setRefreshing(false)
    })

    return () => {
      unsub()
      unsubscribeFromModule("system")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: "OK" }]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    systemClientModule.requestProcessList()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleReboot = () => {
    showAlert(
      t("systemControl:confirmReboot"),
      undefined,
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("common:confirm"),
          style: "destructive",
          onPress: () => {
            setActionInProgress("reboot")
            systemClientModule.requestReboot()
            setTimeout(() => {
              setActionInProgress(null)
              showAlert(t("common:success"), t("systemControl:rebooting"))
            }, 2500)
          },
        },
      ]
    )
  }

  const handleShutdown = () => {
    showAlert(
      t("systemControl:confirmShutdown"),
      undefined,
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("common:confirm"),
          style: "destructive",
          onPress: () => {
            setActionInProgress("shutdown")
            systemClientModule.requestShutdown()
            setTimeout(() => {
              setActionInProgress(null)
              showAlert(t("common:success"), t("systemControl:shuttingDown"))
            }, 2500)
          },
        },
      ]
    )
  }

  const handleKillProcess = (process: ProcessInfo) => {
    showAlert(
      t("systemControl:confirmKill", { name: process.name, pid: process.pid }),
      undefined,
      [
        { text: t("common:cancel"), style: "cancel" },
        {
          text: t("common:confirm"),
          style: "destructive",
          onPress: () => {
            systemClientModule.requestKillProcess(process.pid)
          },
        },
      ]
    )
  }

  return (
    <Screen
      preset="scroll"
      ScrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
      }}
    >
      <Header titleTx="systemControl:title" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* System Actions Card */}
      <Card
        headingTx="systemControl:actions"
        style={themed($card)}
        ContentComponent={
          <View style={$actionButtons}>
            <Button
              preset="reversed"
              style={{ flex: 1 }}
              onPress={handleReboot}
              disabled={actionInProgress !== null}
            >
              <Icon font="Ionicons" icon="refresh" size={20} color={theme.colors.error} />
              <Text weight="medium" style={{ marginLeft: 8 }}>
                {t("systemControl:reboot")}
              </Text>
            </Button>
            <Button
              preset="reversed"
              style={{ flex: 1, marginLeft: theme.spacing.sm }}
              onPress={handleShutdown}
              disabled={actionInProgress !== null}
            >
              <Icon font="Ionicons" icon="power" size={20} color={theme.colors.error} />
              <Text weight="medium" style={{ marginLeft: 8 }}>
                {t("systemControl:shutdown")}
              </Text>
            </Button>
          </View>
        }
      />

      {/* Process List Card */}
      <Card
        style={themed($card)}
        ContentComponent={
          <View>
            <SectionHeader
              titleTx="systemControl:processes"
              rightAction={
                <Button
                  preset="reversed"
                  size="sm"
                  onPress={() => {
                    setLoading(true)
                    systemClientModule.requestProcessList()
                  }}
                  disabled={loading || actionInProgress !== null}
                >
                  <Icon font="Ionicons" icon="refresh" size={16} />
                </Button>
              }
            />

            {loading ? (
              <View style={themed($centered)}>
                <Text color="textDim">{t("systemControl:searchingProcesses")}</Text>
              </View>
            ) : processes.length === 0 ? (
              <View style={themed($centered)}>
                <Text color="textDim">{t("systemControl:noProcesses")}</Text>
              </View>
            ) : (
              <View style={{ marginTop: theme.spacing.sm }}>
                {processes.map((process, index) => (
                  <View key={process.pid}>
                    <ProcessListItem
                      process={process}
                      onKill={handleKillProcess}
                      disabled={actionInProgress !== null}
                    />
                    {index < processes.length - 1 && <View style={themed($separator)} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        }
      />

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

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  gap: 12,
}

const $processItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
})

const $processInfo: ViewStyle = {
  flex: 1,
}

const $processHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $progressSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  gap: 6,
})

const $progressLabel: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $separator: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginTop: spacing.md,
})

const $centered: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
})
