import { FC, useState, useMemo } from "react"
import { View, ViewStyle, ScrollView, Pressable, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { SectionHeader } from "@/components/SectionHeader"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemedViewStyle } from "@/theme/types"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

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
  const [isCreating, setIsCreating] = useState(false)

  // Split jobs into active and disabled
  const { activeJobs, disabledJobs } = useMemo(() => {
    return {
      activeJobs: jobs.filter(job => job.enabled),
      disabledJobs: jobs.filter(job => !job.enabled),
    }
  }, [jobs])

  const handleCreateJob = () => {
    Alert.alert("Create Job", "Create job modal will be implemented next", [
      { text: "OK", style: "default" },
    ])
  }

  const handleRunJob = (jobId: string) => {
    const job = jobs.find(j => j.jobId === jobId)
    Alert.alert("Run Job", `Run "${job?.name}" now?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Run", 
        style: "default",
        onPress: () => {
          Alert.alert("Success", "Job triggered!")
        }
      },
    ])
  }

  const handleToggleJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.jobId === jobId ? { ...job, enabled: !job.enabled } : job
    ))
  }

  const handleEditJob = (jobId: string) => {
    const job = jobs.find(j => j.jobId === jobId)
    Alert.alert("Edit Job", `Edit "${job?.name}"`, [
      { text: "OK", style: "default" },
    ])
  }

  const handleDeleteJob = (jobId: string) => {
    const job = jobs.find(j => j.jobId === jobId)
    Alert.alert("Delete Job", `Delete "${job?.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: () => {
          setJobs(prev => prev.filter(j => j.jobId !== jobId))
          Alert.alert("Deleted", "Job deleted successfully")
        }
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
          android_ripple={{ color: theme.colors.tint + '40' }}
        >
          <View style={$fabIcon}>
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
                <View style={$cardHeader}>
                  <View style={$jobIcon}>
                    <Text text={job.icon} size="xl" />
                  </View>
                  <View style={$jobInfo}>
                    <Text text={job.name} weight="semiBold" size="sm" color="text" />
                    <Text text={job.schedule} size="xs" color="textDim" />
                  </View>
                </View>
                
                <View style={themed($cardStatus)}>
                  <View style={$statusRow}>
                    <View style={themed($statusBadge)}>
                      <View style={[$statusDot, { backgroundColor: theme.colors.success }]} />
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
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
                  >
                    ▶️ Run
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId)}
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
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
              <View key={job.jobId} style={themed([$jobCard, $disabledCard])}>
                <View style={$cardHeader}>
                  <View style={[$jobIcon, $disabledIcon]}>
                    <Text text={job.icon} size="xl" />
                  </View>
                  <View style={$jobInfo}>
                    <Text text={job.name} weight="semiBold" size="sm" color="textDim" />
                    <Text text={job.schedule} size="xs" color="textDim" />
                  </View>
                </View>
                
                <View style={themed($cardStatus)}>
                  <View style={$statusRow}>
                    <View style={themed([$statusBadge, $disabledBadge])}>
                      <View style={[$statusDot, { backgroundColor: theme.colors.textDim }]} />
                      <Text text="Disabled" size="xs" weight="medium" color="textDim" />
                    </View>
                  </View>
                </View>
                
                <View style={themed($cardActions)}>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleToggleJob(job.jobId)}
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
                  >
                    ▶️ Enable
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleEditJob(job.jobId)}
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    preset="default"
                    size="sm"
                    onPress={() => handleDeleteJob(job.jobId)}
                    style={$actionButton}
                    textStyle={{ fontSize: 12 }}
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
            <Text text="📭" size="xxl" style={{ marginBottom: 16 }} />
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
              style={$createButton}
            />
          </View>
        )}
      </View>
    </Screen>
  )
}

const $container: ThemedViewStyle = ({ spacing }) => ({ 
  padding: spacing.md,
  flex: 1,
})

const $sectionHeader: ThemedViewStyle = ({ spacing }) => ({ 
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
})

const $jobCard: ThemedViewStyle = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  marginBottom: spacing.md,
})

const $disabledCard: ThemedViewStyle = ({ colors }) => ({
  opacity: 0.6,
  backgroundColor: colors.surface,
})

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 12,
}

const $jobIcon: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 12,
  backgroundColor: "#EEF2FF",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
}

const $disabledIcon: ViewStyle = {
  backgroundColor: "#F3F4F6",
}

const $jobInfo: ViewStyle = {
  flex: 1,
  paddingTop: 4,
}

const $cardStatus: ViewStyle = {
  marginBottom: 12,
}

const $statusRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}

const $statusBadge: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
}

const $disabledBadge: ViewStyle = {
  backgroundColor: "#F3F4F6",
}

const $statusDot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}

const $cardActions: ViewStyle = {
  flexDirection: "row",
  gap: 8,
}

const $actionButton: ViewStyle = {
  flex: 1,
}

const $emptyState: ThemedViewStyle = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.xl * 2,
})

const $emptyTitle: ThemedViewStyle = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $emptySubtitle: ThemedViewStyle = ({ spacing }) => ({
  marginBottom: spacing.xl,
  textAlign: "center",
})

const $createButton: ViewStyle = {
  minWidth: 200,
}

const $fab: ThemedViewStyle = ({ colors, spacing }) => ({
  position: 'absolute',
  right: spacing.lg,
  bottom: spacing.lg,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.tint,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
  zIndex: 999,
})

const $fabIcon: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
}
