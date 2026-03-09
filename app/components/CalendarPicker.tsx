import { FC, useState } from "react"
import { View, ViewStyle, TextInput, Pressable } from "react-native"
import { DateTimePickerModal } from "@/components/DateTimePickerModal"

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
  const [showDateTimeModal, setShowDateTimeModal] = useState(false)

  const handleQuickCron = (expr: string) => {
    onCronExpressionChange(expr)
  }

  const handleDateTimeConfirm = (date: Date, mode: "single" | "range", endDate?: Date) => {
    const dayOfMonth = date.getDate().toString()
    const month = (date.getMonth() + 1).toString()
    const dayOfWeek = date.getDay().toString()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    let cron: string
    
    if (mode === "range" && endDate) {
      // For range mode, we'll use the start date's day and end date's day
      // Creating a cron that runs on specific days of month
      const endDayOfMonth = endDate.getDate().toString()
      const endMonth = (endDate.getMonth() + 1).toString()
      
      // If same month, create comma-separated days
      if (month === endMonth) {
        cron = `${minutes} ${hours} ${dayOfMonth},${endDayOfMonth} ${month} *`
      } else {
        // Different months - use start date only as fallback
        cron = `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`
      }
    } else {
      // Single date mode
      cron = `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`
    }
    
    onCronExpressionChange(cron)
    onTimeChange(`${hours}:${minutes}`)
  }

  const parseCronToDate = (cron: string): Date => {
    // Parse cron expression to Date object for date picker
    const parts = cron.split(' ')
    const now = new Date()
    if (parts.length >= 5) {
      const minutes = parseInt(parts[0]) || 0
      const hours = parseInt(parts[1]) || 0
      // Handle wildcard "*" by using current date values
      const dayOfMonth = parts[2] === '*' ? now.getDate() : parseInt(parts[2]) || now.getDate()
      const month = parts[3] === '*' ? now.getMonth() : (parseInt(parts[3]) || (now.getMonth() + 1)) - 1
      const year = now.getFullYear()
      return new Date(year, month, dayOfMonth, hours, minutes)
    }
    return now
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
          <View style={themed($scheduleStack)}>
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
            <Pressable
              onPress={() => setShowDateTimeModal(true)}
              style={themed($calendarButton)}
            >
              <View style={themed($calendarButtonContent)}>
                <View style={$calendarIconBadge}>
                  <Icon
                    font="Ionicons"
                    icon="calendar"
                    color={theme.colors.tint}
                    size={20}
                  />
                </View>
                <View style={$calendarButtonText}>
                  <Text
                    text="Select Date & Time"
                    weight="semiBold"
                    size="sm"
                    color="text"
                  />
                  <Text
                    text={parseCronToDate(cronExpression).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    size="xs"
                    color="textDim"
                  />
                </View>
                <Icon
                  font="Ionicons"
                  icon="chevron-forward"
                  color={theme.colors.textDim}
                  size={20}
                />
              </View>
            </Pressable>

            <Text text="Cron Expression" weight="medium" color="textDim" size="xs" style={$cronLabel} />
            <View style={themed($cronDisplay)}>
              <Text
                text={cronExpression}
                size="sm"
                color="text"
                weight="medium"
                style={{ fontFamily: "monospace" }}
              />
            </View>
          </View>
        )}

        {/* DateTime Picker Modal */}
        <DateTimePickerModal
          visible={showDateTimeModal}
          onClose={() => setShowDateTimeModal(false)}
          onConfirm={handleDateTimeConfirm}
          initialDate={parseCronToDate(cronExpression)}
          title="Schedule Date & Time"
        />
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
  minHeight: 44,
  paddingHorizontal: spacing.xs,
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
  paddingHorizontal: spacing.xs,
})

const $weekdayButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  alignItems: "center",
  borderRadius: spacing.md,
  backgroundColor: colors.palette.neutral200,
  minHeight: 40,
})

const $weekdayButtonSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
  borderWidth: 2,
  borderColor: colors.tint,
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
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  alignItems: "center",
  borderRadius: spacing.md,
  backgroundColor: colors.palette.neutral200,
  minHeight: 40,
})

const $unitButtonSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "20",
  borderWidth: 2,
  borderColor: colors.tint,
})

const $cronLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
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

const $cronContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $calendarButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
  minHeight: 64,
})

const $calendarButtonContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: 12,
}

const $calendarIconBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: colors.tint + "15",
  alignItems: "center",
  justifyContent: "center",
})

const $calendarButtonText: ViewStyle = {
  flex: 1,
  gap: 2,
}

const $cronDisplay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  alignItems: "center",
})
