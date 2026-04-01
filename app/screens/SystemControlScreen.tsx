import { FC, useState, useEffect } from "react"
import { View, ViewStyle, FlatList } from "react-native"
import { useTranslation } from "react-i18next"
import { useNavigation } from "@react-navigation/native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { AlertModal, type AlertButton } from "@/components/AlertModal"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useSocket } from "@/services/socket/SocketContext"
import { systemClientModule } from "@/services/socket/modules/system"
import type { ProcessInfo } from "../../shared/types/system"

type SystemControlScreenProps = NativeStackScreenProps<AppStackParamList, "SystemControl">

export const SystemControlScreen: FC<SystemControlScreenProps> = function SystemControlScreen() {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { subscribeToModule, unsubscribeFromModule } = useSocket()

  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [loading, setLoading] = useState(true)
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
    })

    return () => {
      unsub()
      unsubscribeFromModule("system")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: "OK" }]) => {
    setAlertConfig({ visible: true, title, message, buttons })
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

  const renderProcessItem = ({ item }: { item: ProcessInfo }) => (
    <View style={themed($processItem)}>
      <View style={$processInfo}>
        <Text weight="medium" size="sm" numberOfLines={1}>
          {item.name}
        </Text>
        <Text size="xs" color="dim" numberOfLines={1}>
          {item.command}
        </Text>
      </View>
      <View style={$processStats}>
        <View style={themed($statBadge)}>
          <Text size="xs">{(item.cpu ?? 0).toFixed(1)}%</Text>
        </View>
        <View style={themed($statBadge)}>
          <Text size="xs">{(item.memory ?? 0).toFixed(1)}%</Text>
        </View>
        <Button
          preset="reversed"
          onPress={() => handleKillProcess(item)}
          disabled={actionInProgress !== null}
        >
          <Icon
            font="Ionicons"
            icon="close"
            size={16}
            color={theme.colors.error}
          />
        </Button>
      </View>
    </View>
  )

  const renderHeader = () => (
    <View>
      <View style={themed($section)}>
        <Text weight="bold" size="md" style={{ marginBottom: 12 }}>
          {t("systemControl:actions")}
        </Text>
        <View style={$actionButtons}>
          <Button
            preset="reversed"
            style={{ flex: 1, marginRight: 8 }}
            onPress={handleReboot}
            disabled={actionInProgress !== null}
          >
            <Icon
              font="Ionicons"
              icon="refresh"
              size={20}
              color={theme.colors.error}
            />
            <Text weight="medium" style={{ marginLeft: 8 }}>
              {t("systemControl:reboot")}
            </Text>
          </Button>
          <Button
            preset="reversed"
            style={{ flex: 1, marginLeft: 8 }}
            onPress={handleShutdown}
            disabled={actionInProgress !== null}
          >
            <Icon
              font="Ionicons"
              icon="power"
              size={20}
              color={theme.colors.error}
            />
            <Text weight="medium" style={{ marginLeft: 8 }}>
              {t("systemControl:shutdown")}
            </Text>
          </Button>
        </View>
      </View>

      <View style={themed($section)}>
        <View style={$sectionHeader}>
          <Text weight="bold" size="md">
            {t("systemControl:processes")}
          </Text>
          <Button
            preset="reversed"
            onPress={() => {
              setLoading(true)
              systemClientModule.requestProcessList()
            }}
            disabled={loading || actionInProgress !== null}
          >
            <Icon font="Ionicons" icon="refresh" size={16} />
          </Button>
        </View>
      </View>
    </View>
  )

  return (
    <Screen preset="scroll">
      <Header
        titleTx="systemControl:title"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      {renderHeader()}

      <View style={themed($processList)}>
        {loading ? (
          <View style={$centered}>
            <Text color="dim">{t("systemControl:searchingProcesses")}</Text>
          </View>
        ) : processes.length === 0 ? (
          <View style={$centered}>
            <Text color="dim">{t("systemControl:noProcesses")}</Text>
          </View>
        ) : (
          <FlatList
            data={processes}
            keyExtractor={(item) => item.pid.toString()}
            renderItem={renderProcessItem}
            showsVerticalScrollIndicator={false}
          />
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

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
})

const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
}

const $processList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.lg,
  flex: 1,
})

const $processItem: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $processInfo: ViewStyle = {
  flex: 1,
  marginRight: 12,
}

const $processStats: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
}

const $statBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  backgroundColor: colors.border,
  borderRadius: 4,
  minWidth: 40,
  alignItems: "center",
})

const $centered: ViewStyle = {
  padding: 40,
  alignItems: "center",
}
