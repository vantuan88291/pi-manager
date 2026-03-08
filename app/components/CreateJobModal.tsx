import { FC, useState } from "react"
import { View, ViewStyle, TextInput, ScrollView } from "react-native"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { ActionModal } from "@/components/ActionModal"
import { TaskTypePicker, type TaskType } from "@/components/TaskTypePicker"
import { SchedulePicker, type ScheduleType } from "@/components/SchedulePicker"
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
    setFormData(prev => ({ ...prev, taskType: type }))
  }

  const handleScheduleTypeChange = (type: ScheduleType) => {
    setFormData(prev => ({ ...prev, scheduleType: type }))
  }

  const handleValidate = (): boolean => {
    // Validate name
    if (formData.name.length > 50) {
      return false
    }

    // Validate task-specific fields
    if (formData.taskType === "shell" && !formData.command?.trim()) {
      return false
    }
    if (formData.taskType === "agent" && !formData.prompt?.trim()) {
      return false
    }
    if (formData.taskType === "event" && !formData.message?.trim()) {
      return false
    }

    // Validate timeout
    if (formData.timeout && (formData.timeout < 1 || formData.timeout > 3600)) {
      return false
    }

    return true
  }

  const handleSubmit = () => {
    if (!handleValidate()) {
      return
    }
    onSubmit(formData)
    onClose()
  }

  const renderTaskSpecificFields = () => {
    switch (formData.taskType) {
      case "shell":
        return (
          <>
            <View style={themed($field)}>
              <Text text="Command *" weight="medium" color="text" style={$label} />
              <TextInput
                value={formData.command}
                onChangeText={(text) => setFormData(prev => ({ ...prev, command: text }))}
                placeholder="sudo shutdown -h now"
                style={themed($commandInput)}
                multiline
                placeholderTextColor={theme.colors.textDim}
              />
              <Text text="⚠️ Requires sudo permissions" size="xs" color="warning" style={$helperText} />
            </View>

            <View style={themed($field)}>
              <Text text="Working Directory (optional)" weight="medium" color="text" style={$label} />
              <TextInput
                value={formData.workingDir}
                onChangeText={(text) => setFormData(prev => ({ ...prev, workingDir: text }))}
                placeholder="/home/vantuan88291/scripts"
                style={themed($input)}
                placeholderTextColor={theme.colors.textDim}
              />
            </View>

            <View style={themed($field)}>
              <Text text="Timeout (seconds)" weight="medium" color="text" style={$label} />
              <TextInput
                value={formData.timeout?.toString() || "60"}
                onChangeText={(text) => setFormData(prev => ({ ...prev, timeout: parseInt(text) || 60 }))}
                placeholder="60"
                style={themed($input)}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textDim}
              />
              <Text text="Max: 3600 seconds" size="xs" color="textDim" style={$helperText} />
            </View>
          </>
        )

      case "agent":
        return (
          <>
            <View style={themed($field)}>
              <Text text="Prompt *" weight="medium" color="text" style={$label} />
              <TextInput
                value={formData.prompt}
                onChangeText={(text) => setFormData(prev => ({ ...prev, prompt: text }))}
                placeholder="Check system status and create a summary report"
                style={themed($promptInput)}
                multiline
                placeholderTextColor={theme.colors.textDim}
              />
              <Text text={`${formData.prompt?.length || 0}/500`} size="xs" color="textDim" style={[$helperText, { textAlign: "right" }]} />
            </View>

            <View style={themed($field)}>
              <Text text="Model (optional)" weight="medium" color="text" style={$label} />
              <TextInput
                value={formData.model}
                onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
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
            <Text text="Message *" weight="medium" color="text" style={$label} />
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="🔍 Running daily health check..."
              style={themed($input)}
              multiline
              placeholderTextColor={theme.colors.textDim}
            />
            <Text text={`${formData.message?.length || 0}/200`} size="xs" color="textDim" style={[$helperText, { textAlign: "right" }]} />
          </View>
        )
    }
  }

  return (
    <ActionModal
      visible={visible}
      onClose={onClose}
      title="Create Scheduled Task"
      bottomComponent={
        <View style={themed($footer)}>
          <Button text="Cancel" preset="default" onPress={onClose} style={$footerButton} />
          <Button text="Create Task" preset="primary" onPress={handleSubmit} style={$footerButton} />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={$scrollView}>
        {/* Task Name */}
        <View style={themed($field)}>
          <Text text="Task Name (optional)" weight="medium" color="text" style={$label} />
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Daily Shutdown"
            style={themed($input)}
            maxLength={50}
            placeholderTextColor={theme.colors.textDim}
          />
          <Text text={`${formData.name.length}/50`} size="xs" color="textDim" style={[$helperText, { textAlign: "right" }]} />
        </View>

        {/* Task Type Picker */}
        <View style={themed($section)}>
          <Text text="Task Type" weight="semiBold" color="text" size="sm" style={$sectionTitle} />
          <TaskTypePicker selectedType={formData.taskType} onSelect={handleTaskTypeChange} />
        </View>

        {/* Task-Specific Fields */}
        <View style={themed($section)}>
          {renderTaskSpecificFields()}
        </View>

        {/* Schedule Picker */}
        <View style={themed($section)}>
          <Text text="When to Run" weight="semiBold" color="text" size="sm" style={$sectionTitle} />
          <SchedulePicker
            selectedType={formData.scheduleType}
            onSelect={handleScheduleTypeChange}
            time={formData.time}
            onTimeChange={(time) => setFormData(prev => ({ ...prev, time }))}
            weekday={formData.weekday}
            onWeekdayChange={(day) => setFormData(prev => ({ ...prev, weekday: day }))}
            dayOfMonth={formData.dayOfMonth}
            onDayOfMonthChange={(day) => setFormData(prev => ({ ...prev, dayOfMonth: day }))}
            intervalValue={formData.intervalValue}
            onIntervalValueChange={(val) => setFormData(prev => ({ ...prev, intervalValue: val }))}
            intervalUnit={formData.intervalUnit}
            onIntervalUnitChange={(unit) => setFormData(prev => ({ ...prev, intervalUnit: unit }))}
            cronExpression={formData.cronExpression}
            onCronExpressionChange={(expr) => setFormData(prev => ({ ...prev, cronExpression: expr }))}
          />
        </View>

        {/* Notifications */}
        <View style={themed($section)}>
          <Text text="Notifications" weight="semiBold" color="text" size="sm" style={$sectionTitle} />
          <View style={$checkboxRow}>
            <Button
              text={formData.notifySuccess ? "✅ On success" : "⬜ On success"}
              preset="default"
              size="sm"
              onPress={() => setFormData(prev => ({ ...prev, notifySuccess: !prev.notifySuccess }))}
              style={$checkbox}
            />
            <Button
              text={formData.notifyFailure ? "✅ On failure" : "⬜ On failure"}
              preset="default"
              size="sm"
              onPress={() => setFormData(prev => ({ ...prev, notifyFailure: !prev.notifyFailure }))}
              style={$checkbox}
            />
          </View>
        </View>
      </ScrollView>
    </ActionModal>
  )
}

const $scrollView: ViewStyle = { maxHeight: 550 }

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $section: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  marginBottom: spacing.lg,
})

const $sectionTitle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginBottom: 12,
  color: colors.text,
})

const $label: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginBottom: 8,
  color: colors.text,
})

const $input: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 44,
  color: colors.text,
})

const $commandInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 13,
  fontFamily: "monospace",
  minHeight: 100,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  lineHeight: 20,
})

const $promptInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  minHeight: 120,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  lineHeight: 22,
})

const $helperText: ThemedStyle<ViewStyle> = ({ colors }) => ({
  marginTop: 6,
  color: colors.textDim,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.sm,
})

const $footerButton: ViewStyle = {
  flex: 1,
  height: 48,
}

const $checkboxRow: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.sm,
}

const $checkbox: ViewStyle = {
  flex: 1,
  height: 44,
}
