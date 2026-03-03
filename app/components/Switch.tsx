import { FC, useState } from "react"
import { View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"

interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}

export const Switch: FC<SwitchProps> = function Switch({
  value,
  onValueChange,
  disabled = false,
}) {
  const { theme } = useAppTheme()
  const [isPressed, setIsPressed] = useState(false)
  
  const trackColor = value ? theme.colors.tint : theme.colors.palette.neutral400
  const thumbColor = theme.colors.surface
  
  const handlePressIn = () => {
    if (!disabled) {
      setIsPressed(true)
    }
  }
  
  const handlePressOut = () => {
    setIsPressed(false)
    if (!disabled) {
      console.log("[Switch] toggling to:", !value)
      onValueChange(!value)
    }
  }
  
  const handleClick = () => {
    if (!disabled) {
      console.log("[Switch] clicked, toggling to:", !value)
      onValueChange(!value)
    }
  }
  
  return (
    <View
      onMouseDown={handlePressIn}
      onMouseUp={handlePressOut}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onClick={handleClick}
      style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: isPressed ? (trackColor + "80") : trackColor,
        justifyContent: "center",
        padding: 3,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        userSelect: "none",
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: thumbColor,
          shadowColor: theme.colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
          transform: [{ translateX: value ? 20 : 0 }],
          transition: "transform 0.2s",
        }}
      />
    </View>
  )
}
