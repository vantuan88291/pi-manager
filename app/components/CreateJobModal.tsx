import { FC, useState } from "react"
import { View, ViewStyle, TextInput, ScrollView, StyleProp, TextStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { ActionModal } from "@/components/ActionModal"
import { TaskTypeDropdown, type TaskType } from "@/components/TaskTypeDropdown"
import { SchedulePicker, type ScheduleType } from "@/components/SchedulePicker"
import { Checkbox } from "@/components/Toggle/Checkbox"
import type { ThemedStyle } from "@/theme/types"

export interface CronJobFormData {
  name: string
  taskType: TaskType
  // Shell command
  command?: string
  workingDir?: string
  timeout?: number
  // Agent task
  prompt?: string
  model?: string
  // System event
  message?: string
  // Schedule
  scheduleType: ScheduleType
  time?: string
  weekday?: number
  dayOfMonth?: number
  intervalValue?: number
  intervalUnit?: "minutes" | "hours" | "days"
  cronExpression?: string
  // Settings
  notifySuccess?: boolean
  notifyFailure?: boolean
}

interface CreateJobModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: CronJobFormData) => void
  initialData?: Partial<CronJobFormData>
}

const DEFAULT_DATA: CronJobFormData = {
  name: "",
  taskType: "shell",
  command: "",
  workingDir: "",
  timeout: 60,
  prompt: "",
  model: "",
  message: "",
  scheduleType: "daily",
  time: "08:00",
  weekday: 1,
  dayOfMonth: 1,
  intervalValue: 1,
  intervalUnit: "hours",
  cronExpression: "0 * * * *",
  notifySuccess: true,
  notifyFailure: true,
}

export const CreateJobModal: FC<CreateJobModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { themed, theme } = useAppTheme()

  const [formData, setFormData] = useState<CronJobFormData>({
    ...DEFAULT_DATA,
    ...initialData,
  })

  const handleTaskTypeChange = (type: TaskType) => {
    setFormData((prev) => ({ ...prev, taskType: type }))
  }

  const handleScheduleTypeChange = (type: ScheduleType) => {
    setFormData((prev) => ({ ...prev, scheduleType: type }))
  }

  const handleValidate = (): boolean => {
    if (formData.name.length > 50) return false
    if (formData.taskType === "shell" && !formData.command?.trim()) return false
    if (formData.taskType === "agent" && !formData.prompt?.trim()) return false
    if (formData.taskType === "event" && !formData.message?.trim()) return false
    if (formData.timeout && (formData.timeout < 1 || formData.timeout > 3600)) return false
    return true
  }

  const handleSubmit = () => {
    if (!handleValidate()) return
    onSubmit(formData)
    onClose()
  }

  const renderTaskSpecificFields = () => {
    switch (formData.taskType) {
      case "shell":
        return (
          <>
            <View style={themed($field)}>
              <View style={themed($labelRow)}>
                <Text text="Command" weight="medium" color="text" size="sm" />
                <Text text=" *" color="error" size="sm" />
              </View>
              <TextInput
                value={formData.command}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, command: text }))}
                placeholder="sudo shutdown -h now"
                style={themed($multilineInput)}
                multiline
                placeholderTextColor={theme.colors.textDim}
                textAlignVertical="top"
              />
              <View style={themed($warningBanner)}>
                <Text text="⚠️ Requires sudo permissions" size="xs" color="warning" />
              </View>
            </View>

            <View style={themed($field)}>
              <Text text="Working Directory" weight="medium" color="text" size="sm" />
              <TextInput
                value={formData.workingDir}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, workingDir: text }))}
                placeholder="/home/vantuan88291/scripts"
                style={themed($input)}
                placeholderTextColor={theme.colors.textDim}
              />
            </View>

            <View style={themed($field)}>
              <Text text="Timeout (seconds)" weight="medium" color="text" size="sm" />
              <View style={themed($inputRow)}>
                <TextInput
                  value={formData.timeout?.toString() || "60"}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, timeout: parseInt(text) || 60 }))
                  }
                  placeholder="60"
                  style={themed($smallInput)}
                  keyboardType="number-pad"
                  placeholderTextColor={theme.colors.textDim}
                  textAlign="center"
                />
                <Text text="Max: 3600" size="sm" color="textDim" />
              </View>
            </View>
          </>
        )

      case "agent":
        return (
          <>
            <View style={themed($field)}>
              <View style={themed($labelRow)}>
                <Text text="Prompt" weight="medium" color="text" size="sm" />
                <Text text=" *" color="error" size="sm" />
              </View>
              <TextInput
                value={formData.prompt}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, prompt: text }))}
                placeholder="Check system status and create a summary report"
                style={themed($multilineInput)}
                multiline
                placeholderTextColor={theme.colors.textDim}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text
                text={`${formData.prompt?.length || 0}/500`}
                size="xs"
                color="textDim"
                style={$charCount}
              />
            </View>

            <View style={themed($field)}>
              <Text text="Model" weight="medium" color="text" size="sm" />
              <TextInput
                value={formData.model}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, model: text }))}
                placeholder="qwen-coder (default)"
                style={themed($input)}
                placeholderTextColor={theme.colors.textDim}
              />
            </View>
          </>
        )

      case "event":
        return (
          <View style={themed($field)}>
            <View style={themed($labelRow)}>
              <Text text="Message" weight="medium" color="text" size="sm" />
              <Text text=" *" color="error" size="sm" />
            </View>
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, message: text }))}
              placeholder="🔍 Running daily health check..."
              style={themed($multilineInput)}
              multiline
              placeholderTextColor={theme.colors.textDim}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text
              text={`${formData.message?.length || 0}/200`}
              size="xs"
              color="textDim"
              style={$charCount}
            />
          </View>
        )
    }
  }

  return (
    <ActionModal
      visible={visible}
      onClose={onClose}
      title="✨ Create Scheduled Task"
      bottomComponent={
        <View style={themed($footer)}>
          <Button text="Cancel" preset="filled" onPress={onClose} style={themed($cancelButton)} />
          <Button
            text="Create Task"
            preset="filled"
            onPress={handleSubmit}
            style={themed([$saveButton, { backgroundColor: theme.colors.tint }])}
            textStyle={{ color: theme.colors.palette.neutral100 }}
          />
        </View>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={true}
        style={$scrollView}
        contentContainerStyle={$scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Task Name */}
        <View style={themed($field)}>
          <Text text="Task Name" weight="medium" color="text" size="sm" />
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            placeholder="Daily Shutdown"
            style={themed($input)}
            maxLength={50}
            placeholderTextColor={theme.colors.textDim}
          />
          <Text text={`${formData.name.length}/50`} size="xs" color="textDim" style={$charCount} />
        </View>

        {/* Task Type - Compact Dropdown */}
        <View style={themed($field)}>
          <Text text="Task Type" weight="medium" color="text" size="sm" />
          <TaskTypeDropdown selectedType={formData.taskType} onSelect={handleTaskTypeChange} />
        </View>

        {/* Task-Specific Fields */}
        <View style={themed($section)}>
          <Text
            text="Configuration"
            weight="semiBold"
            color="text"
            size="sm"
            style={$sectionTitle}
          />
          {renderTaskSpecificFields()}
        </View>

        {/* Divider */}
        <View style={themed($divider)} />

        {/* Schedule Section */}
        <View style={themed($section)}>
          <View style={themed($sectionHeaderWithIcon)}>
            <Text text="⏰ " size="sm" />
            <Text text="When to Run" weight="semiBold" color="text" size="sm" />
          </View>
          <SchedulePicker
            selectedType={formData.scheduleType}
            onSelect={handleScheduleTypeChange}
            time={formData.time}
            onTimeChange={(time) => setFormData((prev) => ({ ...prev, time }))}
            weekday={formData.weekday}
            onWeekdayChange={(day) => setFormData((prev) => ({ ...prev, weekday: day }))}
            dayOfMonth={formData.dayOfMonth}
            onDayOfMonthChange={(day) => setFormData((prev) => ({ ...prev, dayOfMonth: day }))}
            intervalValue={formData.intervalValue}
            onIntervalValueChange={(val) =>
              setFormData((prev) => ({ ...prev, intervalValue: val }))
            }
            intervalUnit={formData.intervalUnit}
            onIntervalUnitChange={(unit) =>
              setFormData((prev) => ({ ...prev, intervalUnit: unit }))
            }
            cronExpression={formData.cronExpression}
            onCronExpressionChange={(expr) =>
              setFormData((prev) => ({ ...prev, cronExpression: expr }))
            }
          />
        </View>

        {/* Divider */}
        <View style={themed($divider)} />

        {/* Notifications Section */}
        <View style={themed($section)}>
          <View style={themed($sectionHeaderWithIcon)}>
            <Text text="🔔 " size="sm" />
            <Text text="Notifications" weight="semiBold" color="text" size="sm" />
          </View>
          <View style={themed($checkboxContainer)}>
            <View style={themed($checkboxRow)}>
              <Checkbox
                value={formData.notifySuccess ?? true}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, notifySuccess: value }))
                }
              />
              <Text text="Notify on completion" size="sm" color="text" style={$checkboxLabel} />
            </View>
            <View style={themed($checkboxRow)}>
              <Checkbox
                value={formData.notifyFailure ?? true}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, notifyFailure: value }))
                }
              />
              <Text text="Notify on failure" size="sm" color="text" style={$checkboxLabel} />
            </View>
          </View>
        </View>

        {/* Extra bottom padding for keyboard */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </ActionModal>
  )
}

const $scrollView: ViewStyle = { flex: 1 }

const $scrollContent: ViewStyle = {
  paddingHorizontal: 20,
  paddingTop: 8,
}

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  flex: 1,
})

const $sectionTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $labelRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.sm,
})

const $sectionHeaderWithIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.md,
})

// Standardized input style - all inputs use this
const $input: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 48,
  color: colors.text,
})

// Multiline input for command/prompt/message
const $multilineInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  minHeight: 100,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  lineHeight: 22,
})

// Small input for numbers (timeout, etc.)
const $smallInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  width: 80,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 48,
  color: colors.text,
})

const $inputRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
})

const $warningBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.warning + "15",
  borderRadius: spacing.sm,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginTop: spacing.sm,
})

const $charCount: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
  textAlign: "right",
})

const $divider: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: 1,
  backgroundColor: colors.border,
  marginVertical: spacing.lg,
})

const $checkboxContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
  marginTop: spacing.sm,
})

const $checkboxRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
})

const $checkboxLabel: ViewStyle = {
  flex: 1,
}

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.lg,
  paddingHorizontal: 20,
})

const $cancelButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  height: 48,
  borderRadius: spacing.md,
})

const $saveButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 2,
  height: 48,
  borderRadius: spacing.md,
})
