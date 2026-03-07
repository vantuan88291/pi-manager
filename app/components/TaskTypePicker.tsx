import { FC } from "react"
import { View, ViewStyle, Pressable } from "react-native"

import { useAppTheme } from "@/theme/context"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import type { ThemedStyle } from "@/theme/types"

export type TaskType = "shell" | "agent" | "event"

interface TaskTypeInfo {
  type: TaskType
  icon: string
  font: "Ionicons" | "MaterialCommunityIcons"
  title: string
  description: string
  warnings?: string[]
}

const TASK_TYPES: TaskTypeInfo[] = [
  {
    type: "shell",
    icon: "terminal",
    font: "Ionicons",
    title: "Shell Command",
    description: "Run bash commands directly on your Raspberry Pi. Use for system control, scripts, and automation tasks.",
    warnings: ["Requires proper sudo configuration", "Commands are validated for safety"],
  },
  {
    type: "agent",
    icon: "robot",
    font: "Ionicons",
    title: "Agent Task",
    description: "AI agent will execute your prompt to perform intelligent tasks like analysis, reporting, and decision making.",
    warnings: ["Be specific in your instructions", "Set appropriate timeout (30-300s)", "Model: qwen-coder (default)"],
  },
  {
    type: "event",
    icon: "chatbubble-ellipses",
    font: "Ionicons",
    title: "System Event",
    description: "Send a notification message to your OpenClaw session. Use for reminders, alerts, and simple announcements.",
    warnings: ["Supports emojis and formatting", "Instant delivery (no execution time)", "Delivers to configured channel"],
  },
]

interface TaskTypePickerProps {
  selectedType: TaskType
  onSelect: (type: TaskType) => void
}

export const TaskTypePicker: FC<TaskTypePickerProps> = ({ selectedType, onSelect }) => {
  const { themed, theme } = useAppTheme()

  return (
    <View style={themed($container)}>
      {TASK_TYPES.map((taskType) => {
        const isSelected = selectedType === taskType.type
        
        return (
          <View key={taskType.type} style={themed($taskWrapper)}>
            {/* Selectable Card */}
            <Pressable
              onPress={() => onSelect(taskType.type)}
              style={themed([
                $card,
                isSelected && $selectedCard,
              ])}
            >
              <View style={[$cardHeader, isSelected && $selectedCardHeader]}>
                <View style={[$iconBadge, { backgroundColor: isSelected ? theme.colors.tint + '20' : theme.colors.border }]}>
                  <Icon 
                    font={taskType.font} 
                    icon={taskType.icon as any} 
                    color={isSelected ? theme.colors.tint : theme.colors.textDim} 
                    size={24} 
                  />
                </View>
                <View style={$cardContent}>
                  <Text 
                    text={taskType.title} 
                    weight="semiBold" 
                    size="sm" 
                    color={isSelected ? "tint" : "text"} 
                  />
                  {isSelected && (
                    <View style={$checkmark}>
                      <Icon font="Ionicons" icon="checkmark-circle" color={theme.colors.tint} size={20} />
                    </View>
                  )}
                </View>
              </View>
            </Pressable>

            {/* Info Box (only show when selected) */}
            {isSelected && (
              <View style={themed($infoBox)}>
                <View style={$infoIcon}>
                  <Icon font="Ionicons" icon="information-circle" color={theme.colors.textDim} size={18} />
                </View>
                <View style={$infoContent}>
                  <Text text={taskType.description} size="xs" color="textDim" style={$infoDescription} />
                  {taskType.warnings?.map((warning, index) => (
                    <View key={index} style={$warningRow}>
                      <Icon font="Ionicons" icon="warning" color={theme.colors.warning} size={14} />
                      <Text text={warning} size="xs" color="warning" style={$warningText} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({ 
  gap: spacing.md,
  paddingHorizontal: spacing.sm,
})

const $taskWrapper: ViewStyle = { marginBottom: 0 }

const $card: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  borderWidth: 2,
  borderColor: colors.border,
  padding: spacing.lg,
  marginBottom: 0,
  minHeight: 70,
})

const $selectedCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + '08', // 5% opacity
})

const $cardHeader: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $selectedCardHeader: ViewStyle = {
  alignItems: "center",
}

const $cardContent: ViewStyle = {
  flex: 1,
  marginLeft: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}

const $iconBadge: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
}

const $checkmark: ViewStyle = {
  width: 24,
  height: 24,
  alignItems: "center",
  justifyContent: "center",
}

const $infoBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.info + '15', // 8% opacity
  borderRadius: spacing.lg,
  padding: spacing.lg,
  marginTop: spacing.md,
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.md,
  borderWidth: 1,
  borderColor: colors.info + '30',
})

const $infoIcon: ViewStyle = {
  paddingTop: 2,
}

const $infoContent: ViewStyle = {
  flex: 1,
  gap: 6,
}

const $infoDescription: ViewStyle = {
  lineHeight: 18,
}

const $warningRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
}

const $warningText: ViewStyle = {
  flex: 1,
  lineHeight: 16,
}
