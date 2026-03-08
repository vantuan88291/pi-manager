import { FC, useState } from "react"
import { View, ViewStyle, TextInput, ScrollView, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { TaskTypeDropdown, type TaskType } from "@/components/TaskTypeDropdown"
import { CalendarPicker, type ScheduleType } from "@/components/CalendarPicker"
import { Checkbox } from "@/components/Toggle/Checkbox"
import type { ThemedStyle } from "@/theme/types"

export interface CronJobFormData {
  name: string
  taskType: TaskType
  command?: string
  workingDir?: string
  timeout?: number
  prompt?: string
  model?: string
  message?: string
  scheduleType: ScheduleType
  time?: string
  weekday?: number
  dayOfMonth?: number
  intervalValue?: number
  intervalUnit?: "minutes" | "hours" | "days"
  cronExpression?: string
  notifySuccess?: boolean
  notifyFailure?: boolean
}

interface CreateJobScreenParams {
  onSubmit: (data: CronJobFormData) => void
  initialData?: Partial<CronJobFormData>
}

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      CreateJob: CreateJobScreenParams
    }
  }
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

export const CreateJobScreen: FC = () => {
  const navigation = useNavigation()
  const { themed, theme } = useAppTheme()
  const route = navigation.getState() as any
  const params = route?.routes?.[route.routes.length - 1]?.params as CreateJobScreenParams | undefined
  
  const onSubmit = params?.onSubmit ?? (() => {})
  const initialData = params?.initialData

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
    navigation.goBack()
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
                onChangeText={(text) => setFormData(prev => ({ ...prev, command: text }))}
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
                onChangeText={(text) => setFormData(prev => ({ ...prev, workingDir: text }))}
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, timeout: parseInt(text) || 60 }))}
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
                onChangeText={(text) => setFormData(prev => ({ ...prev, prompt: text }))}
                placeholder="Check system status and create a summary report"
                style={themed($multilineInput)}
                multiline
                placeholderTextColor={theme.colors.textDim}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text text={`${formData.prompt?.length || 0}/500`} size="xs" color="textDim" style={themed($charCount)} />
            </View>

            <View style={themed($field)}>
              <Text text="Model" weight="medium" color="text" size="sm" />
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
            <View style={themed($labelRow)}>
              <Text text="Message" weight="medium" color="text" size="sm" />
              <Text text=" *" color="error" size="sm" />
            </View>
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="🔍 Running daily health check..."
              style={themed($multilineInput)}
              multiline
              placeholderTextColor={theme.colors.textDim}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text text={`${formData.message?.length || 0}/200`} size="xs" color="textDim" style={themed($charCount)} />
          </View>
        )
    }
  }

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={themed($header)}>
        <Pressable onPress={() => navigation.goBack()} style={themed($backButton)}>
          <Icon font="Ionicons" icon="chevron-back" color={theme.colors.text} size={24} />
        </Pressable>
        <Text text="✨ Create Scheduled Task" weight="semiBold" size="lg" color="text" />
        <View style={$spacer} />
      </View>

      {/* Form Content with Padding */}
      <View style={themed($contentWrapper)}>
        {/* Task Name */}
        <View style={themed($field)}>
          <Text text="Task Name" weight="medium" color="text" size="sm" />
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Daily Shutdown"
            style={themed($input)}
            maxLength={50}
            placeholderTextColor={theme.colors.textDim}
          />
          <Text text={`${formData.name.length}/50`} size="xs" color="textDim" style={themed($charCount)} />
        </View>

        {/* Task Type - Compact Dropdown */}
        <View style={themed($field)}>
          <Text text="Task Type" weight="medium" color="text" size="sm" />
          <TaskTypeDropdown selectedType={formData.taskType} onSelect={handleTaskTypeChange} />
        </View>

        {/* Task-Specific Fields */}
        <View style={themed($section)}>
          <Text text="Configuration" weight="semiBold" color="text" size="md" style={$sectionTitle} />
          {renderTaskSpecificFields()}
        </View>

        {/* Divider */}
        <View style={themed($divider)} />

        {/* Schedule Section */}
        <View style={themed($section)}>
          <View style={themed($sectionHeaderWithIcon)}>
            <Text text="⏰ " size="sm" />
            <Text text="When to Run" weight="semiBold" color="text" size="md" />
          </View>
          <CalendarPicker
            scheduleType={formData.scheduleType}
            onScheduleTypeChange={handleScheduleTypeChange}
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

        {/* Divider */}
        <View style={themed($divider)} />

        {/* Notifications Section */}
        <View style={themed($section)}>
          <View style={themed($sectionHeaderWithIcon)}>
            <Text text="🔔 " size="sm" />
            <Text text="Notifications" weight="semiBold" color="text" size="md" />
          </View>
          <View style={themed($checkboxContainer)}>
            <View style={themed($checkboxRow)}>
              <Checkbox
                value={formData.notifySuccess ?? true}
                onValueChange={(value) => setFormData(prev => ({ ...prev, notifySuccess: value }))}
              />
              <Text text="Notify on completion" size="sm" color="text" style={$checkboxLabel} />
            </View>
            <View style={themed($checkboxRow)}>
              <Checkbox
                value={formData.notifyFailure ?? true}
                onValueChange={(value) => setFormData(prev => ({ ...prev, notifyFailure: value }))}
              />
              <Text text="Notify on failure" size="sm" color="text" style={$checkboxLabel} />
            </View>
          </View>
        </View>

        {/* Extra bottom padding for footer spacing */}
        <View style={{ height: 16 }} />
      </View>

      {/* Footer Actions */}
      <View style={themed($footer)}>
        <Button
          text="Cancel"
          preset="filled"
          onPress={() => navigation.goBack()}
          style={themed($cancelButton)}
        />
        <Button
          text="Create Task"
          preset="filled"
          onPress={handleSubmit}
          style={themed([$saveButton, { backgroundColor: theme.colors.tint }])}
          textStyle={{ color: theme.colors.palette.neutral100 }}
        />
      </View>
    </Screen>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $contentWrapper: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.lg,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  marginLeft: -spacing.sm,
})

const $spacer: ViewStyle = {
  width: 40,
}

const $field: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
})

const $sectionTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
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

const $footer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  gap: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.lg,
  paddingHorizontal: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.background,
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
