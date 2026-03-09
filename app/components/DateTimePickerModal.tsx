import { FC, useState } from "react"
import { View, ViewStyle, Modal, Pressable, ScrollView } from "react-native"
import DateTimePicker from "react-native-ui-datepicker"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import type { ThemedStyle } from "@/theme/types"

interface DateTimePickerModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (date: Date, mode: "single" | "range", endDate?: Date) => void
  initialDate?: Date
  initialEndDate?: Date
  title?: string
  mode?: "single" | "range"
}

export const DateTimePickerModal: FC<DateTimePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate = new Date(),
  initialEndDate,
  title = "Select Date & Time",
  mode = "range",
}) => {
  const { themed, theme } = useAppTheme()
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(initialEndDate)
  const [rangeSelectionStep, setRangeSelectionStep] = useState<"start" | "end">("start")

  const handleConfirm = () => {
    if (mode === "range" && selectedEndDate) {
      onConfirm(selectedDate, mode, selectedEndDate)
    } else {
      onConfirm(selectedDate, mode)
    }
    onClose()
  }

  const handleDateChange = (date: Date) => {
    if (mode === "range") {
      if (rangeSelectionStep === "start" || !selectedEndDate) {
        // First selection or re-selecting start
        setSelectedDate(date)
        setSelectedEndDate(undefined)
        setRangeSelectionStep("end")
      } else {
        // Second selection - end date
        if (date >= selectedDate) {
          setSelectedEndDate(date)
        } else {
          // If selected date is before start date, swap them
          setSelectedEndDate(selectedDate)
          setSelectedDate(date)
        }
      }
    } else {
      setSelectedDate(date)
    }
  }

  const quickPresets = [
    { label: "Today", getDate: () => new Date() },
    { label: "Tomorrow", getDate: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d
    }},
    { label: "Next Week", getDate: () => {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      return d
    }},
    { label: "Next Month", getDate: () => {
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      return d
    }},
  ]

  const handleQuickSelect = (getDate: () => Date) => {
    const date = getDate()
    if (mode === "range") {
      if (rangeSelectionStep === "start") {
        setSelectedDate(date)
        setSelectedEndDate(undefined)
        setRangeSelectionStep("end")
      } else {
        if (date >= selectedDate) {
          setSelectedEndDate(date)
        } else {
          setSelectedEndDate(selectedDate)
          setSelectedDate(date)
        }
      }
    } else {
      setSelectedDate(date)
    }
  }

  // Build custom styles for datepicker using theme colors
  const datePickerStyles = {
    days: { 
      backgroundColor: theme.colors.surface,
      padding: 4,
    },
    day_cell: { 
      padding: 1,
    },
    day: { 
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    day_label: { 
      color: theme.colors.text, 
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    months: { backgroundColor: theme.colors.surface, padding: 8 },
    month: { 
      borderRadius: 10, 
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
      paddingVertical: 10,
    },
    month_label: { color: theme.colors.text, fontSize: 13 },
    years: { backgroundColor: theme.colors.surface, padding: 8 },
    year: { 
      borderRadius: 10, 
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
      paddingVertical: 10,
    },
    year_label: { color: theme.colors.text, fontSize: 13 },
    header: { 
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: 8,
    },
    month_selector_label: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    year_selector_label: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    time_selector_label: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    weekdays: { 
      backgroundColor: theme.colors.surface,
      paddingTop: 4,
    },
    weekday_label: {
      fontSize: 11,
      textTransform: 'uppercase' as const,
      color: theme.colors.textDim,
      fontWeight: '700',
    },
    button_next: {},
    button_prev: {},
    time_label: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    time_selected_indicator: {
      backgroundColor: theme.colors.tint + '25',
      borderRadius: 10,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    // Selected day state
    selected: {
      backgroundColor: theme.colors.tint,
      shadowColor: theme.colors.tint,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    selected_label: {
      color: theme.colors.palette.neutral100,
      fontWeight: '700',
      fontSize: 13,
    },
    // Today state
    today: {
      backgroundColor: theme.colors.tint + '20',
      borderWidth: 2,
      borderColor: theme.colors.tint,
    },
    today_label: {
      color: theme.colors.tint,
      fontWeight: '700',
      fontSize: 13,
    },
    outside_label: {
      color: theme.colors.textDim,
      opacity: 0.3,
    },
    disabled_label: {
      color: theme.colors.textDim,
      opacity: 0.3,
    },
    range_fill: { backgroundColor: 'transparent' },
    range_middle: { backgroundColor: 'transparent' },
    range_middle_label: { color: theme.colors.text },
    range_start_label: { color: theme.colors.palette.neutral100 },
    range_end_label: { color: theme.colors.palette.neutral100 },
    selected_month: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
      borderWidth: 2,
    },
    selected_month_label: { 
      color: theme.colors.palette.neutral100,
      fontWeight: '700',
    },
    selected_year: {
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.tint,
      borderWidth: 2,
    },
    selected_year_label: { 
      color: theme.colors.palette.neutral100,
      fontWeight: '700',
    },
    active_year: {
      backgroundColor: theme.colors.tint + '20',
      borderColor: theme.colors.tint,
      borderWidth: 2,
    },
    active_year_label: { 
      color: theme.colors.tint,
      fontWeight: '600',
    },
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={themed($overlay)}>
        <View style={themed($modalContent)}>
          {/* Header */}
          <View style={themed($header)}>
            <View style={$headerTitle}>
              <Text text={title} weight="semiBold" size="lg" color="text" />
              {mode === "range" && (
                <Text 
                  text={rangeSelectionStep === "start" ? " (Select Start)" : " (Select End)"} 
                  weight="medium" 
                  size="sm" 
                  color="tint" 
                />
              )}
            </View>
            <Pressable onPress={onClose} style={themed($closeButton)}>
              <Icon font="Ionicons" icon="close" color={theme.colors.text} size={24} />
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={$scrollContent}
            contentContainerStyle={$scrollContentContainer}
          >
            {/* Date Picker */}
            <View style={themed($pickerContainer)}>
              <DateTimePicker
                mode={mode}
                date={mode === "range" ? undefined : selectedDate}
                startDate={mode === "range" ? selectedDate : undefined}
                endDate={mode === "range" ? selectedEndDate : undefined}
                onChange={({ date, startDate, endDate }) => {
                  if (mode === "range") {
                    if (startDate) {
                      setSelectedDate(new Date(startDate as string))
                      setRangeSelectionStep("end")
                    }
                    if (endDate) {
                      setSelectedEndDate(new Date(endDate as string))
                    }
                  } else if (date) {
                    setSelectedDate(new Date(date as string))
                  }
                }}
                timePicker
                use12Hours={false}
                minuteInterval={15}
                locale="en"
                styles={datePickerStyles}
                theme="light"
              />
            </View>

            {/* Range Selection Info */}
            {mode === "range" && (
              <View style={themed($rangeInfo)}>
                <View style={themed($rangeItem)}>
                  <Text text="📍 Start:" size="sm" weight="semiBold" color="text" />
                  <Text text={selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} size="sm" color="text" />
                </View>
                <View style={themed($rangeItem)}>
                  <Text text="🏁 End:" size="sm" weight="semiBold" color="text" />
                  <Text text={selectedEndDate ? selectedEndDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Not selected"} size="sm" color={selectedEndDate ? "text" : "textDim"} />
                </View>
              </View>
            )}

            {/* Quick Presets */}
            <View style={themed($presetsSection)}>
              <Text text="Quick Select" weight="medium" color="textDim" size="xs" style={$presetsLabel} />
              <View style={themed($presetsRow)}>
                {quickPresets.map((preset, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleQuickSelect(preset.getDate)}
                    style={themed($presetButton)}
                  >
                    <Text text={preset.label} size="xs" color="tint" weight="medium" />
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={themed($actions)}>
            <Button
              text="Cancel"
              preset="default"
              onPress={onClose}
              style={themed($cancelButton)}
            />
            <Button
              text="Confirm"
              preset="primary"
              onPress={handleConfirm}
              style={themed($confirmButton)}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const $overlay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral900 + "80",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
})

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.xl,
  width: "100%",
  maxWidth: 500,
  maxHeight: "80%",
  overflow: "hidden",
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.1)",
})

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  marginLeft: spacing.sm,
})

const $scrollContent: ViewStyle = {
  flex: 1,
}

const $scrollContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
})

const $pickerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  paddingHorizontal: spacing.sm,
})

const $datePicker: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
})

const $headerTitle: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $rangeInfo: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "10",
  borderRadius: spacing.lg,
  padding: spacing.lg,
  paddingVertical: spacing.lg,
  marginBottom: spacing.xl,
  marginTop: spacing.sm,
  marginHorizontal: spacing.md,
  gap: spacing.md,
})

const $rangeItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
})

const $presetsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.xl,
  marginTop: spacing.lg,
  paddingHorizontal: spacing.md,
})

const $presetsLabel: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  paddingHorizontal: spacing.sm,
  marginTop: spacing.sm,
})

const $presetsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.lg,
  paddingHorizontal: spacing.xs,
  paddingBottom: spacing.sm,
})

const $presetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing.xl,
  borderRadius: spacing.lg,
  backgroundColor: colors.tint + "15",
  minHeight: 48,
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  gap: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.lg,
  paddingHorizontal: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.surface,
})

const $cancelButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  height: 48,
  borderRadius: spacing.md,
  justifyContent: "center",
  alignItems: "center",
})

const $confirmButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  height: 48,
  borderRadius: spacing.md,
  justifyContent: "center",
  alignItems: "center",
})
