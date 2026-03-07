import { FC, useState } from "react"
import { View, ViewStyle, TextInput } from "react-native"

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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

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

  return (
    <View style={themed($container)}>
      {/* Schedule Type Segmented Control */}
      <View style={themed($segmentedControl)}>
        {(["daily", "weekly", "monthly", "interval", "custom"] as ScheduleType[]).map((type) => (
          <Button
            key={type}
            text={type.charAt(0).toUpperCase() + type.slice(1)}
            preset={selectedType === type ? "primary" : "default"}
            size="sm"
            onPress={() => onSelect(type)}
            style={$segmentButton}
          />
        ))}
      </View>

      {/* Daily Schedule */}
      {selectedType === "daily" && (
        <View style={themed($scheduleContent)}>
          <Text text="Every day at" weight="medium" color="text" style={$label} />
          <TextInput
            value={time}
            onChangeText={onTimeChange}
            placeholder="08:00"
            style={themed($timeInput)}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Weekly Schedule */}
      {selectedType === "weekly" && (
        <View style={themed($scheduleContent)}>
          <Text text="Every" weight="medium" color="text" style={$label} />
          <View style={$weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <Button
                key={day}
                text={day.slice(0, 3)}
                preset={weekday === index ? "primary" : "default"}
                size="sm"
                onPress={() => onWeekdayChange(index)}
                style={$weekdayButton}
              />
            ))}
          </View>
          <Text text="at" weight="medium" color="text" style={$label} />
          <TextInput
            value={time}
            onChangeText={onTimeChange}
            placeholder="08:00"
            style={themed($timeInput)}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Monthly Schedule */}
      {selectedType === "monthly" && (
        <View style={themed($scheduleContent)}>
          <Text text="On day" weight="medium" color="text" style={$label} />
          <TextInput
            value={dayOfMonth.toString()}
            onChangeText={(text) => onDayOfMonthChange(parseInt(text) || 1)}
            placeholder="1"
            style={themed($dayInput)}
            keyboardType="number-pad"
          />
          <Text text="of every month at" weight="medium" color="text" style={$label} />
          <TextInput
            value={time}
            onChangeText={onTimeChange}
            placeholder="08:00"
            style={themed($timeInput)}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Interval Schedule */}
      {selectedType === "interval" && (
        <View style={themed($scheduleContent)}>
          <Text text="Every" weight="medium" color="text" style={$label} />
          <View style={$intervalRow}>
            <TextInput
              value={intervalValue.toString()}
              onChangeText={(text) => onIntervalValueChange(parseInt(text) || 1)}
              placeholder="1"
              style={themed($intervalInput)}
              keyboardType="number-pad"
            />
            <View style={$unitPicker}>
              {(["minutes", "hours", "days"] as const).map((unit) => (
                <Button
                  key={unit}
                  text={unit.charAt(0).toUpperCase() + unit.slice(1)}
                  preset={intervalUnit === unit ? "primary" : "default"}
                  size="sm"
                  onPress={() => onIntervalUnitChange(unit)}
                  style={$unitButton}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Custom Cron */}
      {selectedType === "custom" && (
        <View style={themed($scheduleContent)}>
          <Text text="Cron Expression" weight="medium" color="text" style={$label} />
          <TextInput
            value={cronExpression}
            onChangeText={onCronExpressionChange}
            placeholder="0 * * * *"
            style={themed($cronInput)}
            multiline
          />
          <Text text="Quick picks:" weight="medium" color="textDim" size="xs" style={$quickPickLabel} />
          <View style={$quickPicks}>
            <Button text="Every hour" preset="default" size="sm" onPress={() => handleQuickCron("0 * * * *")} style={$quickPick} />
            <Button text="Daily 8AM" preset="default" size="sm" onPress={() => handleQuickCron("0 8 * * *")} style={$quickPick} />
            <Button text="Weekly Mon" preset="default" size="sm" onPress={() => handleQuickCron("0 2 * * 1")} style={$quickPick} />
            <Button text="Monthly 1st" preset="default" size="sm" onPress={() => handleQuickCron("0 9 1 * *")} style={$quickPick} />
          </View>
        </View>
      )}
    </View>
  )
}

const $container: ViewStyle = { gap: 16 }

const $segmentedControl: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  backgroundColor: colors.border,
  borderRadius: spacing.md,
  padding: spacing.xs,
  gap: spacing.xs,
  flexWrap: "wrap",
})

const $segmentButton: ViewStyle = { flex: 1, minWidth: 80 }

const $scheduleContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  gap: spacing.md,
})

const $label: ViewStyle = { marginBottom: 4 }

const $timeInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.border,
  borderRadius: spacing.md,
  padding: spacing.md,
  fontSize: 16,
  textAlign: "center",
})

const $dayInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.border,
  borderRadius: spacing.md,
  padding: spacing.md,
  fontSize: 16,
  width: 80,
  textAlign: "center",
})

const $weekdayRow: ViewStyle = {
  flexDirection: "row",
  gap: 4,
  flexWrap: "wrap",
  justifyContent: "space-between",
}

const $weekdayButton: ViewStyle = { flex: 1, minWidth: 50 }

const $intervalRow: ViewStyle = {
  flexDirection: "row",
  gap: 12,
  alignItems: "center",
}

const $intervalInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.border,
  borderRadius: spacing.md,
  padding: spacing.md,
  fontSize: 16,
  width: 100,
  textAlign: "center",
})

const $unitPicker: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  gap: 4,
}

const $unitButton: ViewStyle = { flex: 1 }

const $cronInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.border,
  borderRadius: spacing.md,
  padding: spacing.md,
  fontSize: 14,
  fontFamily: "monospace",
  minHeight: 60,
})

const $quickPickLabel: ViewStyle = { marginTop: 8 }

const $quickPicks: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
}

const $quickPick: ViewStyle = { minWidth: 100 }
