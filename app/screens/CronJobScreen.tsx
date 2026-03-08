import { FC, useState, useMemo } from "react"
import { View, ViewStyle, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { AlertModal, type AlertButton } from "@/components/AlertModal"
import { Button } from "@/components/Button"
import { Header } from "@/components/Header"
import { CreateJobScreen, type CronJobFormData } from "@/screens/CreateJobScreen"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { SectionHeader } from "@/components/SectionHeader"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle } from "@/theme/types"

type CronJobScreenProps = AppStackScreenProps<"CronJob">

// Mock data for development - will be replaced with socket data
interface MockCronJob {
  jobId: string
  name: string
  icon: string
  schedule: string
  enabled: boolean
  nextRun: string
  type: "shell" | "agent" | "event"
}

const MOCK_JOBS: MockCronJob[] = [
  {
    jobId: "1",
    name: "Daily Shutdown",
    icon: "🖥️",
    schedule: "Every day at 10:00 PM",
    enabled: true,
    nextRun: "2h 15m",
    type: "shell",
  },
  {
    jobId: "2",
    name: "Weekly Backup",
    icon: "💾",
    schedule: "Every Monday at 2:00 AM",
    enabled: true,
    nextRun: "3d 5h",
    type: "shell",
  },
  {
    jobId: "3",
    name: "System Report",
    icon: "🤖",
    schedule: "Every day at 8:00 AM",
    enabled: true,
    nextRun: "18h 30m",
    type: "agent",
  },
  {
    jobId: "4",
    name: "Old Log Cleanup",
    icon: "🗑️",
    schedule: "Every Sunday at 3:00 AM",
    enabled: false,
    nextRun: "--",
    type: "shell",
  },
]

export const CronJobScreen: FC<CronJobScreenProps> = function CronJobScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<MockCronJob[]>(MOCK_JOBS)

  // Alert modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean
    title: string
    message?: string
    buttons: AlertButton[]
  }>({ visible: false, title: "", buttons: [] })

  // Create job screen state
  const [isCreating, setIsCreating] = useState(false)

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

  const handleCreateJob = () => {
    navigation.navigate("CreateJob", {
      onSubmit: handleJobSubmit,
    })
  }

  const handleJobSubmit = (data: CronJobFormData) => {
    console.log("[CronJobScreen] Creating job with data:", data)
    // TODO: Connect to socket module to create job
    navigation.goBack()
    showAlert("Success", `Job "${data.name || "Untitled"}" created!`)
  }

  const handleRunJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    showAlert("Run Job", `Run "${job?.name}" now?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Run",
        onPress: () => showAlert("Success", "Job triggered!"),
      },
    ])
  }

  const handleToggleJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) => (job.jobId === jobId ? { ...job, enabled: !job.enabled } : job)),
    )
  }

  const handleEditJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    showAlert("Edit Job", `Edit "${job?.name}"`, [{ text: "OK" }])
  }

  const handleDeleteJob = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    showAlert("Delete Job", `Delete "${job?.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setJobs((prev) => prev.filter((j) => j.jobId !== jobId))
          showAlert("Deleted", "Job deleted successfully")
        },
      },
    ])
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
        {/* Active Jobs Section */}
        {activeJobs.length > 0 && (
          <>
            <SectionHeader
              title={`📊 ${activeJobs.length} Active Jobs`}
              style={themed($sectionHeader)}
            />

            {activeJobs.map((job) => (
              <View key={job.jobId} style={themed($jobCard)}>
                <View style={themed($cardHeader)}>
                  <View style={themed($jobIcon)}>
                    <Text text={job.icon} size="xl" />
                  </View>
                  <View style={themed($jobInfo)}>
                    <Text text={job.name} weight="semiBold" size="sm" color="text" />
                    <Text text={job.schedule} size="xs" color="textDim" />
                  </View>
                </View>

                <View style={themed($cardStatus)}>
                  <View style={themed($statusRow)}>
                    <View style={themed($statusBadge)}>
                      <View style={themed($statusDot)} />
                      <Text text="Enabled" size="xs" weight="medium" color="success" />
                    </View>
                    <Text text={`🟢 Next: ${job.nextRun}`} size="xs" color="textDim" />
                  </View>
                </View>

                <View style={themed($cardActions)}>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleRunJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ▶️ Run
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ⏸️ Disable
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
              title={`⚪ ${disabledJobs.length} Disabled Jobs`}
              style={themed($sectionHeader)}
            />

            {disabledJobs.map((job) => (
              <View key={job.jobId} style={themed($disabledJobCard)}>
                <View style={themed($cardHeader)}>
                  <View style={themed($disabledJobIcon)}>
                    <Text text={job.icon} size="xl" />
                  </View>
                  <View style={themed($jobInfo)}>
                    <Text text={job.name} weight="semiBold" size="sm" color="textDim" />
                    <Text text={job.schedule} size="xs" color="textDim" />
                  </View>
                </View>

                <View style={themed($cardStatus)}>
                  <View style={themed($statusRow)}>
                    <View style={themed($disabledStatusBadge)}>
                      <View style={themed($disabledStatusDot)} />
                      <Text text="Disabled" size="xs" weight="medium" color="textDim" />
                    </View>
                  </View>
                </View>

                <View style={themed($cardActions)}>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ▶️ Enable
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleDeleteJob(job.jobId)}
                    style={themed($actionButton)}
                  >
                    🗑️ Delete
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
              tx="cronjob:createFirstJob"
              preset="primary"
              onPress={handleCreateJob}
              style={themed($createButton)}
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

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  flex: 1,
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
