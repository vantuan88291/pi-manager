import { FC, useState } from "react"
import { View, ViewStyle, Pressable, Modal, Platform } from "react-native"
import { Picker } from "@react-native-picker/picker"

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
}

const TASK_TYPES: TaskTypeInfo[] = [
  {
    type: "shell",
    icon: "terminal",
    font: "Ionicons",
    title: "Shell Command",
    description: "Run bash commands on your Pi",
  },
  {
    type: "agent",
    icon: "robot",
    font: "Ionicons",
    title: "Agent Task",
    description: "AI agent executes your prompt",
  },
  {
    type: "event",
    icon: "chatbubble-ellipses",
    font: "Ionicons",
    title: "System Event",
    description: "Send notification message",
  },
]

interface TaskTypeDropdownProps {
  selectedType: TaskType
  onSelect: (type: TaskType) => void
}

export const TaskTypeDropdown: FC<TaskTypeDropdownProps> = ({ selectedType, onSelect }) => {
  const { themed, theme } = useAppTheme()
  const [showModal, setShowModal] = useState(false)

  const selectedTask = TASK_TYPES.find(t => t.type === selectedType)

  const handleSelect = (type: TaskType) => {
    onSelect(type)
    setShowModal(false)
  }

  // Native picker for better UX
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return (
      <View style={themed($container)}>
        <View style={themed($pickerWrapper)}>
          <Picker
            selectedValue={selectedType}
            onValueChange={(value: TaskType) => onSelect(value)}
            style={themed($picker)}
          >
            {TASK_TYPES.map((task) => (
              <Picker.Item
                key={task.type}
                label={`${task.title} - ${task.description}`}
                value={task.type}
              />
            ))}
          </Picker>
        </View>
      </View>
    )
  }

  // Custom dropdown for web
  return (
    <>
      <Pressable
        onPress={() => setShowModal(true)}
        style={themed($container)}
      >
        <View style={themed($selectedRow)}>
          <View style={themed($iconBadge)}>
            <Icon
              font={selectedTask?.font}
              icon={selectedTask?.icon as any}
              color={theme.colors.tint}
              size={18}
            />
          </View>
          <View style={$content}>
            <Text
              text={selectedTask?.title || ""}
              weight="medium"
              size="sm"
              color="text"
            />
            <Text
              text={selectedTask?.description || ""}
              size="xs"
              color="textDim"
            />
          </View>
          <Icon
            font="Ionicons"
            icon="chevron-down"
            color={theme.colors.textDim}
            size={20}
          />
        </View>
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={themed($modalOverlay)}
          onPress={() => setShowModal(false)}
        >
          <View style={themed($modalContent)}>
            <Text
              text="Select Task Type"
              weight="semiBold"
              size="md"
              color="text"
              style={$modalTitle}
            />
            {TASK_TYPES.map((task) => (
              <Pressable
                key={task.type}
                onPress={() => handleSelect(task.type)}
                style={[
                  themed($optionRow),
                  selectedType === task.type && themed($optionRowSelected),
                ]}
              >
                <View style={themed($optionIconBadge)}>
                  <Icon
                    font={task.font}
                    icon={task.icon as any}
                    color={selectedType === task.type ? theme.colors.tint : theme.colors.textDim}
                    size={20}
                  />
                </View>
                <View style={$optionContent}>
                  <Text
                    text={task.title}
                    weight="medium"
                    size="sm"
                    color={selectedType === task.type ? "tint" : "text"}
                  />
                  <Text
                    text={task.description}
                    size="xs"
                    color="textDim"
                  />
                </View>
                {selectedType === task.type && (
                  <Icon
                    font="Ionicons"
                    icon="checkmark-circle"
                    color={theme.colors.tint}
                    size={20}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 48,
})

const $pickerWrapper: ViewStyle = {
  overflow: "hidden",
}

const $picker: ThemedStyle<ViewStyle> = ({ colors }) => ({
  color: colors.text,
})

const $selectedRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
}

const $iconBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: colors.tint + "15",
  alignItems: "center",
  justifyContent: "center",
})

const $content: ViewStyle = {
  flex: 1,
  gap: 2,
}

const $modalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.neutral900 + "80",
  justifyContent: "center",
  alignItems: "center",
})

const $modalContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.surface,
  borderRadius: spacing.lg,
  padding: spacing.lg,
  minWidth: 300,
  maxWidth: "90%",
})

const $modalTitle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  textAlign: "center",
})

const $optionRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderRadius: spacing.md,
})

const $optionRowSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "10",
})

const $optionIconBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral100,
  alignItems: "center",
  justifyContent: "center",
})

const $optionContent: ViewStyle = {
  flex: 1,
  gap: 2,
}
