import { FC, useState } from "react"
import { View, ViewStyle, TextInput, Pressable } from "react-native"
import { Calendar, LocaleConfig } from "react-native-calendars"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import type { ThemedStyle } from "@/theme/types"

export type ScheduleType = "daily" | "weekly" | "monthly" | "interval" | "custom" | "datetime"

interface CalendarPickerProps {
  scheduleType: ScheduleType
  onScheduleTypeChange: (type: ScheduleType) => void
  // Date/time selection
  selectedDate?: string
  onDateChange?: (date: string) => void
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
  // Custom cron
  cronExpression?: string
  onCronExpressionChange?: (expr: string) => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const CalendarPicker: FC<CalendarPickerProps> = ({
  scheduleType,
  onScheduleTypeChange,
  selectedDate,
  onDateChange = () => {},
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
  const [showCalendar, setShowCalendar] = useState(false)

  const handleDateSelect = (date: any) => {
    onDateChange(date.dateString)
    setShowCalendar(false)
  }

  const handleQuickCron = (expr: string) => {
    onCronExpressionChange(expr)
  }

  const formatSelectedDate = (dateString?: string) => {
    if (!dateString) return "Select date"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    })
  }

  const scheduleOptions = [
    { type: "daily" as ScheduleType, label: "Daily", icon: "calendar" },
    { type: "weekly" as ScheduleType, label: "Weekly", icon: "calendar" },
    { type: "monthly" as ScheduleType, label: "Monthly", icon: "calendar" },
    { type: "interval" as ScheduleType, label: "Interval", icon: "time" },
    { type: "custom" as ScheduleType, label: "Custom", icon: "code" },
  ]

  return (
    <View style={themed($container)}>
      {/* Schedule Type Selector */}
      <View style={themed($typeSelector)}>
        {scheduleOptions.map((option) => (
          <Pressable
            key={option.type}
            onPress={() => onScheduleTypeChange(option.type)}
            style={[
              themed($typeOption),
              scheduleType === option.type && themed($typeOptionSelected),
            ]}
          >
            <Text
              text={option.label}
              size="xs"
              weight="medium"
              color={scheduleType === option.type ? "tint" : "textDim"}
            />
          </Pressable>
        ))}
      </View>

      {/* Schedule Content */}
      <View style={themed($scheduleContent)}>
        {/* Daily Schedule */}
        {scheduleType === "daily" && (
          <View style={themed($scheduleRow)}>
            <Text text="Every day at" weight="medium" color="text" size="sm" />
            <TextInput
              value={time}
              onChangeText={onTimeChange}
              placeholder="08:00"
              style={themed($timeInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
              textAlign="center"
            />
          </View>
        )}

        {/* Weekly Schedule */}
        {scheduleType === "weekly" && (
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
                      text={day.charAt(0)}
                      size="sm"
                      weight="semiBold"
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
                textAlign="center"
              />
            </View>
          </View>
        )}

        {/* Monthly Schedule */}
        {scheduleType === "monthly" && (
          <View style={themed($scheduleRow)}>
            <Text text="On day" weight="medium" color="text" size="sm" />
            <TextInput
              value={dayOfMonth.toString()}
              onChangeText={(text) => onDayOfMonthChange(parseInt(text) || 1)}
              placeholder="1"
              style={themed($dayInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
              textAlign="center"
            />
            <Text text="of every month at" weight="medium" color="text" size="sm" />
            <TextInput
              value={time}
              onChangeText={onTimeChange}
              placeholder="08:00"
              style={themed($timeInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
              textAlign="center"
            />
          </View>
        )}

        {/* Interval Schedule */}
        {scheduleType === "interval" && (
          <View style={themed($scheduleRow)}>
            <Text text="Every" weight="medium" color="text" size="sm" />
            <TextInput
              value={intervalValue.toString()}
              onChangeText={(text) => onIntervalValueChange(parseInt(text) || 1)}
              placeholder="1"
              style={themed($intervalInput)}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textDim}
              textAlign="center"
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
        {scheduleType === "custom" && (
          <View style={themed($cronContainer)}>
            <Text text="Cron Expression" weight="medium" color="text" size="sm" style={$cronLabel} />
            <TextInput
              value={cronExpression}
              onChangeText={onCronExpressionChange}
              placeholder="0 * * * *"
              style={themed($cronInput)}
              placeholderTextColor={theme.colors.textDim}
              textAlign="center"
            />
            <Text text="Quick picks:" weight="medium" color="textDim" size="xs" style={$quickPickLabel} />
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

const $typeSelector: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  flexWrap: "wrap",
})

const $typeOption: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderRadius: spacing.md,
  backgroundColor: colors.palette.neutral100,
})

const $typeOptionSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
})

const $scheduleContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  gap: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
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
  backgroundColor: colors.palette.neutral200,
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
  backgroundColor: colors.palette.neutral200,
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
