import { FC, useState } from "react"
import { View, ViewStyle, TextInput, Pressable } from "react-native"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import type { ThemedStyle } from "@/theme/types"

export type ScheduleType = "daily" | "weekly" | "monthly" | "interval" | "custom"

interface SchedulePickerProps {
  selectedType: ScheduleType
  onSelect: (type: ScheduleType) => void
  // Daily/Weekly/Monthly
  time?: string
  onTimeChange?: (time: string) => void
  // Weekly
  weekday?: number
  onWeekdayChange?: (day: number) => void
  // Monthly
  dayOfMonth?: number
  onDayOfMonthChange?: (day: number) => void
  // Interval
  intervalValue?: number
  onIntervalValueChange?: (value: number) => void
  intervalUnit?: "minutes" | "hours" | "days"
  onIntervalUnitChange?: (unit: "minutes" | "hours" | "days") => void
  // Custom
  cronExpression?: string
  onCronExpressionChange?: (expr: string) => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const SCHEDULE_OPTIONS: ScheduleType[] = ["daily", "weekly", "monthly", "interval", "custom"]

export const SchedulePicker: FC<SchedulePickerProps> = ({
  selectedType,
  onSelect,
  time = "08:00",
  onTimeChange = () => {},
  weekday = 1,
  onWeekdayChange = () => {},
  dayOfMonth = 1,
  onDayOfMonthChange = () => {},
  intervalValue = 1,
  onIntervalValueChange = () => {},
  intervalUnit = "hours",
  onIntervalUnitChange = () => {},
  cronExpression = "0 * * * *",
  onCronExpressionChange = () => {},
}) => {
  const { themed, theme } = useAppTheme()

  const handleQuickCron = (expr: string) => {
    onCronExpressionChange(expr)
  }

  const renderSegment = (type: ScheduleType, label: string) => {
    const isSelected = selectedType === type
    return (
      <Pressable
        key={type}
        onPress={() => onSelect(type)}
        style={[themed($segment), isSelected && themed($segmentSelected)]}
      >
        <Text text={label} size="xs" weight="medium" color={isSelected ? "tint" : "textDim"} />
      </Pressable>
    )
  }

  return (
    <View style={themed($container)}>
      {/* iOS-style Segmented Control */}
      <View style={themed($segmentedControl)}>
        {SCHEDULE_OPTIONS.map((type) =>
          renderSegment(type, type.charAt(0).toUpperCase() + type.slice(1)),
        )}
      </View>

      {/* Schedule Content */}
      <View style={themed($scheduleContent)}>
        {/* Daily Schedule */}
        {selectedType === "daily" && (
          <View style={themed($scheduleRow)}>
            <Text text="Every day at" weight="medium" color="text" size="sm" />
            <TextInput
              value={time}
              onChangeText={onTimeChange}
              placeholder="08:00"
              style={themed($timeInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
            />
          </View>
        )}

        {/* Weekly Schedule */}
        {selectedType === "weekly" && (
          <View style={themed($scheduleStack)}>
            <View style={themed($scheduleRow)}>
              <Text text="Every" weight="medium" color="text" size="sm" />
              <View style={themed($weekdayRow)}>
                {WEEKDAYS.map((day, index) => (
                  <Pressable
                    key={day}
                    onPress={() => onWeekdayChange(index)}
                    style={[
                      themed($weekdayButton),
                      weekday === index && themed($weekdayButtonSelected),
                    ]}
                  >
                    <Text
                      text={day}
                      size="xs"
                      weight="medium"
                      color={weekday === index ? "tint" : "textDim"}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={themed($scheduleRow)}>
              <Text text="at" weight="medium" color="text" size="sm" />
              <TextInput
                value={time}
                onChangeText={onTimeChange}
                placeholder="08:00"
                style={themed($timeInput)}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textDim}
              />
            </View>
          </View>
        )}

        {/* Monthly Schedule */}
        {selectedType === "monthly" && (
          <View style={themed($scheduleRow)}>
            <Text text="On day" weight="medium" color="text" size="sm" />
            <TextInput
              value={dayOfMonth.toString()}
              onChangeText={(text) => onDayOfMonthChange(parseInt(text) || 1)}
              placeholder="1"
              style={themed($dayInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
            />
            <Text text="of every month at" weight="medium" color="text" size="sm" />
            <TextInput
              value={time}
              onChangeText={onTimeChange}
              placeholder="08:00"
              style={themed($timeInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
            />
          </View>
        )}

        {/* Interval Schedule */}
        {selectedType === "interval" && (
          <View style={themed($scheduleRow)}>
            <Text text="Every" weight="medium" color="text" size="sm" />
            <TextInput
              value={intervalValue.toString()}
              onChangeText={(text) => onIntervalValueChange(parseInt(text) || 1)}
              placeholder="1"
              style={themed($intervalInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
            />
            <View style={themed($unitPicker)}>
              {(["minutes", "hours", "days"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => onIntervalUnitChange(unit)}
                  style={[
                    themed($unitButton),
                    intervalUnit === unit && themed($unitButtonSelected),
                  ]}
                >
                  <Text
                    text={unit.charAt(0).toUpperCase() + unit.slice(1)}
                    size="xs"
                    weight="medium"
                    color={intervalUnit === unit ? "tint" : "textDim"}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Custom Cron */}
        {selectedType === "custom" && (
          <View style={themed($cronContainer)}>
            <Text
              text="Cron Expression"
              weight="medium"
              color="text"
              size="sm"
              style={$cronLabel}
            />
            <TextInput
              value={cronExpression}
              onChangeText={onCronExpressionChange}
              placeholder="0 * * * *"
              style={themed($cronInput)}
              placeholderTextColor={theme.colors.textDim}
            />
            <Text
              text="Quick picks:"
              weight="medium"
              color="textDim"
              size="xs"
              style={$quickPickLabel}
            />
            <View style={themed($quickPicks)}>
              {[
                { label: "Hourly", expr: "0 * * * *" },
                { label: "Daily 8AM", expr: "0 8 * * *" },
                { label: "Weekly Mon", expr: "0 2 * * 1" },
                { label: "Monthly 1st", expr: "0 9 1 * *" },
              ].map((pick) => (
                <Pressable
                  key={pick.expr}
                  onPress={() => handleQuickCron(pick.expr)}
                  style={themed($quickPickButton)}
                >
                  <Text text={pick.label} size="xs" color="tint" />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

// iOS-style Segmented Control
const $segmentedControl: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  backgroundColor: colors.palette.neutral200,
  borderRadius: spacing.sm,
  padding: 2,
  minHeight: 36,
})

const $segment: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: spacing.sm - 2,
  paddingVertical: spacing.sm,
})

const $segmentSelected: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.sm - 2,
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
})

const $scheduleContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  gap: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  flex: 1,
})

const $scheduleRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  flexWrap: "wrap",
  minHeight: 40,
})

const $scheduleStack: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $timeInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  textAlign: "center",
  borderWidth: 1,
  borderColor: colors.border,
  minWidth: 80,
  color: colors.text,
})

const $dayInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  width: 50,
  textAlign: "center",
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
})

const $weekdayRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  flex: 1,
})

const $weekdayButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  alignItems: "center",
  borderRadius: spacing.sm,
  backgroundColor: colors.palette.neutral100,
})

const $weekdayButtonSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
})

const $intervalInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: 15,
  width: 60,
  textAlign: "center",
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
})

const $unitPicker: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  flex: 1,
})

const $unitButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  alignItems: "center",
  borderRadius: spacing.sm,
  backgroundColor: colors.palette.neutral100,
})

const $unitButtonSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
})

const $cronContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $cronLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xs,
})

const $cronInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  fontSize: 14,
  fontFamily: "monospace",
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
})

const $quickPickLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $quickPicks: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginTop: spacing.sm,
})

const $quickPickButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: spacing.sm,
  backgroundColor: colors.tint + "15",
})
