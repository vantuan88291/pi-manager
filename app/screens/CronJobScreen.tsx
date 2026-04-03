import { FC, useState, useMemo, useEffect, useCallback } from "react"
import { View, ViewStyle, Pressable, ActivityIndicator } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { AlertModal, type AlertButton } from "@/components/AlertModal"
import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import type { CronJobFormData } from "@/utils/cronJobForm"
import {
  cronJobToFormData,
  formDataToCreateRequest,
  formDataToCronJobPatch,
} from "@/utils/cronJobForm"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"
import type { CronJob } from "@/services/socket/modules/cronjob"
import { socketManager, cronjobClientModule } from "@/services/socket"
import { useSafeAreaFrame } from "react-native-safe-area-context"

type CronJobScreenProps = AppStackScreenProps<"CronJob">

// Helper to format schedule to human-readable string
const formatSchedule = (schedule: CronJob["schedule"]): string => {
  switch (schedule.kind) {
    case "cron":
      return `Cron: ${schedule.expr}`
    case "every":
      const minutes = Math.floor(schedule.everyMs / 60000)
      const hours = Math.floor(schedule.everyMs / 3600000)
      const days = Math.floor(schedule.everyMs / 86400000)
      if (days > 0) return `Every ${days} day${days > 1 ? "s" : ""}`
      if (hours > 0) return `Every ${hours} hour${hours > 1 ? "s" : ""}`
      return `Every ${minutes} minute${minutes > 1 ? "s" : ""}`
    case "at":
      return `Once at ${new Date(schedule.at).toLocaleString()}`
    default:
      return "Unknown schedule"
  }
}

// Helper to format next run time
const formatNextRun = (nextRunAt?: number): string => {
  if (!nextRunAt) return "--"
  const diff = nextRunAt - Date.now()
  if (diff < 0) return "Now"

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

// Helper to get icon based on payload type
const getJobIcon = (payload: CronJob["payload"]): string => {
  switch (payload.kind) {
    case "systemEvent":
      return "📢"
    case "agentTurn":
      return "🤖"
    default:
      return "⚙️"
  }
}

// Helper to get job description based on payload
const getJobDescription = (payload: CronJob["payload"]): string => {
  switch (payload.kind) {
    case "systemEvent":
      return payload.text || "System notification"
    case "agentTurn":
      return payload.message || "AI agent task"
    default:
      return "Shell command"
  }
}

export const CronJobScreen: FC<CronJobScreenProps> = function CronJobScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Alert modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: "", buttons: [] })

  // Initialize socket module
  useEffect(() => {
    const socket = socketManager.getSocket()
    if (!socket) return

    // Create cronjob client module
    const cronjobModule = cronjobClientModule(socket)

    // Set up event handlers
    cronjobModule.onListResponse = ({ jobs }) => {
      setJobs(jobs)
      setLoading(false)
      setRefreshing(false)
      setError(null)
    }

    cronjobModule.onCreated = () => {
      // List will be refreshed automatically by backend
      showAlert("Success", "Job created successfully!")
    }

    cronjobModule.onUpdated = ({ job }) => {
      setJobs((prev) => prev.map((j) => (j.jobId === job.jobId ? job : j)))
      showAlert("Success", `Job "${job.name || "Untitled"}" updated!`)
    }

    cronjobModule.onRemoved = ({ jobId }) => {
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
      showAlert("Deleted", "Job deleted successfully")
    }

    cronjobModule.onError = (err) => {
      setError(err.message)
      setLoading(false)
      showAlert("Error", err.message)
    }

    // Subscribe to module
    socketManager.subscribeToModule("cronjob")

    // Request initial list
    cronjobModule.requestList()

    // Cleanup
    return () => {
      socketManager.unsubscribeFromModule("cronjob")
    }
  }, [])

  // Split jobs into active and disabled
  const { activeJobs, disabledJobs } = useMemo(() => {
    return {
      activeJobs: jobs.filter((job) => job.enabled),
      disabledJobs: jobs.filter((job) => !job.enabled),
    }
  }, [jobs])

  const showAlert = (
    title: string,
    message?: string,
    buttons: AlertButton[] = [{ text: "OK" }],
  ) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }

  const handleCronJobFormSubmit = useCallback(
    (data: CronJobFormData, editingJobId?: string) => {
      const socket = socketManager.getSocket()
      if (!socket) {
        showAlert("Error", "Not connected to server")
        return
      }

      const cronjobModule = cronjobClientModule(socket)

      if (editingJobId) {
        const job = jobs.find((j) => j.jobId === editingJobId)
        cronjobModule.requestUpdate({
          jobId: editingJobId,
          patch: formDataToCronJobPatch(data, { enabled: job?.enabled ?? true }),
        })
        return
      }

      cronjobModule.requestCreate(formDataToCreateRequest(data))
      showAlert("Success", "Job created!")
      setRefreshing(true)
      setTimeout(() => {
        navigation.navigate("CronJob")
      }, 500)
    },
    [jobs, navigation],
  )

  const handleCreateJob = () => {
    navigation.navigate("CreateJob", {
      onSubmit: handleCronJobFormSubmit,
    })
  }

  const handleRunJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    showAlert(t("cronjob:runJob"), t("cronjob:runJobConfirm", { name: job?.name || "Untitled" }), [
      { text: t("cronjob:cancel"), style: "cancel" },
      {
        text: runningJobId === jobId ? "⏳" : "▶️ " + t("cronjob:run"),
        onPress: () => {
          const socket = socketManager.getSocket()
          if (!socket) return
          const cronjobModule = cronjobClientModule(socket)
          setRunningJobId(jobId)
          cronjobModule.requestRun(jobId)
          setTimeout(() => setRunningJobId(null), 2000)
        },
      },
    ])
  }

  const handleToggleJob = (jobId: string, currentEnabled: boolean) => {
    const socket = socketManager.getSocket()
    if (!socket) return
    const cronjobModule = cronjobClientModule(socket)

    // Optimistic update
    setJobs((prev) =>
      prev.map((job) => (job.jobId === jobId ? { ...job, enabled: !currentEnabled } : job)),
    )

    cronjobModule.requestToggle(jobId, !currentEnabled)
  }

  const handleEditJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    if (!job) return

    navigation.navigate("CreateJob", {
      onSubmit: handleCronJobFormSubmit,
      initialData: cronJobToFormData(job),
      editingJobId: job.jobId,
    })
  }

  const handleDeleteJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    showAlert(
      t("cronjob:deleteJob"),
      t("cronjob:deleteJobConfirm", { name: job?.name || "Untitled" }),
      [
        { text: t("cronjob:cancel"), style: "cancel" },
        {
          text: deletingJobId === jobId ? "⏳" : "🗑️ " + t("cronjob:delete"),
          style: "destructive",
          onPress: () => {
            const socket = socketManager.getSocket()
            if (!socket) return
            const cronjobModule = cronjobClientModule(socket)
            setDeletingJobId(jobId)
            cronjobModule.requestRemove(jobId)
          },
        },
      ],
    )
  }

  // Render loading state
  if (loading) {
    return (
      <Screen preset="scroll" bottomComponent={null}>
        <Header
          titleTx="cronjob:title"
          titleMode="center"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text tx="cronjob:loading" size="md" color="textDim" style={themed($loadingText)} />
        </View>
      </Screen>
    )
  }

  // Render error state
  if (error && jobs.length === 0) {
    return (
      <Screen preset="scroll" bottomComponent={null}>
        <Header
          titleTx="cronjob:title"
          titleMode="center"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={themed($errorContainer)}>
          <Text text="❌" size="xxl" style={themed($errorIcon)} />
          <Text
            tx="cronjob:errorTitle"
            size="lg"
            weight="semiBold"
            color="text"
            style={themed($errorTitle)}
          />
          <Text
            text={error}
            size="sm"
            color="textDim"
            textAlign="center"
            style={themed($errorMessage)}
          />
          <Button
            text="Retry"
            preset="primary"
            onPress={() => {
              setLoading(true)
              setError(null)
              const socket = socketManager.getSocket()
              if (socket) {
                const cronjobModule = cronjobClientModule(socket)
                cronjobModule.requestList()
              }
            }}
            style={themed($retryButton)}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      preset="scroll"
      bottomComponent={
        <Pressable
          onPress={handleCreateJob}
          style={themed($fab)}
          android_ripple={{ color: theme.colors.tint + "40" }}
        >
          <View style={themed($fabIcon)}>
            <Ionicons name="add" size={28} color={theme.colors.palette.neutral100} />
          </View>
        </Pressable>
      }
    >
      <Header
        titleTx="cronjob:title"
        titleMode="center"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <View style={themed($container)}>
        {/* Refreshing Indicator */}
        {refreshing && (
          <View style={themed($refreshingBar)}>
            <ActivityIndicator size="small" color={theme.colors.tint} />
            <Text
              tx="cronjob:refreshing"
              size="xs"
              color="textDim"
              style={themed($refreshingText)}
            />
          </View>
        )}

        {/* Active Jobs Section */}
        {activeJobs.length > 0 && (
          <>
            <SectionHeader
              title={`📊 ${t("cronjob:activeJobs", { count: activeJobs.length })}`}
              style={themed($sectionHeader)}
            />

            {activeJobs.map((job) => (
              <View key={job.jobId} style={themed($jobCard)}>
                <View style={themed($cardHeader)}>
                  <View style={themed($jobIcon)}>
                    <Text text={getJobIcon(job.payload)} size="xl" />
                  </View>
                  <View style={themed($jobInfo)}>
                    <Text
                      text={job.name || "Untitled Job"}
                      weight="semiBold"
                      size="sm"
                      color="text"
                    />
                    <Text text={formatSchedule(job.schedule)} size="xs" color="textDim" />
                    <Text
                      text={getJobDescription(job.payload)}
                      size="xs"
                      color="textDim"
                      numberOfLines={2}
                      style={themed($jobDescription)}
                    />
                  </View>
                </View>

                <View style={themed($cardStatus)}>
                  <View style={themed($statusRow)}>
                    <View style={themed($statusBadge)}>
                      <View style={themed($statusDot)} />
                      <Text tx="cronjob:enabled" size="xs" weight="medium" color="success" />
                    </View>
                    <Text
                      text={`🟢 ${t("cronjob:nextRun", { time: formatNextRun(job.nextRunAt) })}`}
                      size="xs"
                      color="textDim"
                    />
                  </View>
                </View>

                <View style={themed($cardActions)}>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleRunJob(job.jobId)}
                    style={themed($actionButton)}
                    disabled={runningJobId === job.jobId}
                  >
                    {runningJobId === job.jobId ? "⏳" : "▶️"} {t("cronjob:run")}
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ✏️ {t("cronjob:edit")}
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId, true)}
                    style={themed($actionButton)}
                  >
                    ⏸️ {t("cronjob:disable")}
                  </Button>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Disabled Jobs Section */}
        {disabledJobs.length > 0 && (
          <>
            <SectionHeader
              title={`⚪ ${t("cronjob:disabledJobs", { count: disabledJobs.length })}`}
              style={themed($sectionHeader)}
            />

            {disabledJobs.map((job) => (
              <View key={job.jobId} style={themed($disabledJobCard)}>
                <View style={themed($cardHeader)}>
                  <View style={themed($disabledJobIcon)}>
                    <Text text={getJobIcon(job.payload)} size="xl" />
                  </View>
                  <View style={themed($jobInfo)}>
                    <Text
                      text={job.name || "Untitled Job"}
                      weight="semiBold"
                      size="sm"
                      color="textDim"
                    />
                    <Text text={formatSchedule(job.schedule)} size="xs" color="textDim" />
                    <Text
                      text={getJobDescription(job.payload)}
                      size="xs"
                      color="textDim"
                      numberOfLines={2}
                      style={themed($jobDescription)}
                    />
                  </View>
                </View>

                <View style={themed($cardStatus)}>
                  <View style={themed($statusRow)}>
                    <View style={themed($disabledStatusBadge)}>
                      <View style={themed($disabledStatusDot)} />
                      <Text tx="cronjob:disabled" size="xs" weight="medium" color="textDim" />
                    </View>
                  </View>
                </View>

                <View style={themed($cardActions)}>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId, false)}
                    style={themed($actionButton)}
                  >
                    ▶️ {t("cronjob:enable")}
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ✏️ {t("cronjob:edit")}
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleDeleteJob(job.jobId)}
                    style={themed($actionButton)}
                    disabled={deletingJobId === job.jobId}
                  >
                    {deletingJobId === job.jobId ? "⏳" : "🗑️"} {t("cronjob:delete")}
                  </Button>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Empty State */}
        {jobs.length === 0 && (
          <View style={themed($emptyState)}>
            <Text text="📭" size="xxl" style={themed($emptyIcon)} />
            <Text
              tx="cronjob:emptyState"
              size="lg"
              weight="semiBold"
              color="text"
              style={themed($emptyTitle)}
            />
            <Text
              tx="cronjob:emptySubtitle"
              size="sm"
              color="textDim"
              style={themed($emptySubtitle)}
            />
            <Button
              tx="cronjob:retry"
              preset="primary"
              onPress={() => {
                setLoading(true)
                setError(null)
                const socket = socketManager.getSocket()
                if (socket) {
                  const cronjobModule = cronjobClientModule(socket)
                  cronjobModule.requestList()
                }
              }}
              style={themed($retryButton)}
            />
          </View>
        )}
      </View>

      {/* Alert Modal */}
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

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
})

const $loadingText: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
})

const $errorIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $errorTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $errorMessage: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
  textAlign: "center",
})

const $retryButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minWidth: 150,
})

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  flex: 1,
})

const $refreshingBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.tint + "10",
  borderRadius: spacing.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.md,
  gap: spacing.sm,
})

const $refreshingText: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
})

const $jobCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  marginBottom: spacing.md,
})

const $disabledJobCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  marginBottom: spacing.md,
  opacity: 0.6,
})

const $cardHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 12,
})

const $jobIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  backgroundColor: colors.palette.accent50,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
})

const $disabledJobIcon: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral200,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
})

const $jobInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  paddingTop: 4,
})

const $jobDescription: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  fontStyle: "italic",
})

const $cardStatus: ThemedStyle<ViewStyle> = () => ({
  marginBottom: 12,
})

const $statusRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
})

const $statusBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: spacing.lg,
  backgroundColor: colors.palette.success200,
})

const $disabledStatusBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: spacing.lg,
  backgroundColor: colors.palette.neutral200,
})

const $statusDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.success,
})

const $disabledStatusDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.textDim,
})

const $cardActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
})

const $actionButton: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.xl * 2,
})

const $emptyIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $emptyTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $emptySubtitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
  textAlign: "center",
})

const $createButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minWidth: 200,
  marginTop: spacing.md,
})

const $fab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: spacing.lg,
  bottom: spacing.lg,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
  zIndex: 999,
})

const $fabIcon: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  justifyContent: "center",
})
