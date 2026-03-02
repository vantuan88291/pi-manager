import { FC, useState } from "react"
import { View, ViewStyle, Pressable, TextStyle } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { getFeatureColor } from "@/theme/featureColors"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type CameraScreenProps = AppStackScreenProps<"Camera">

type Resolution = "480p" | "720p" | "1080p"

const RESOLUTIONS: { label: Resolution }[] = [
  { label: "480p" },
  { label: "720p" },
  { label: "1080p" },
]

export const CameraScreen: FC<CameraScreenProps> = function CameraScreen({ navigation }) {
  const { theme } = useAppTheme()
  const { accent: cameraAccent } = getFeatureColor("camera", theme.isDark)
  const [resolution, setResolution] = useState<Resolution>("720p")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const stats = { fps: 24, bitrate: "2.1 Mbps" }

  const handleStart = () => {
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      setIsStreaming(true)
    }, 2000)
  }

  const handleStop = () => setIsStreaming(false)
  const handleSnapshot = () => console.log("Snapshot")

  const handleResolutionChange = (newRes: Resolution) => {
    setResolution(newRes)
    if (isStreaming) { handleStop(); setTimeout(() => handleStart(), 500) }
  }

  const videoBg = theme.isDark ? "#0F172A" : "#1E293B"

  return (
    <Screen preset="fixed">
      <Header title="Camera" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Resolution Selector */}
      <View style={$segmentedContainer}>
        <View style={[$segmentedControl, { backgroundColor: theme.isDark ? theme.colors.palette?.neutral800 : theme.colors.palette?.neutral200 }]}>
          {RESOLUTIONS.map((res) => (
            <Pressable key={res.label} style={[$segmentButton, resolution === res.label && { backgroundColor: theme.colors.surface }]} onPress={() => handleResolutionChange(res.label)}>
              <Text text={res.label} size="xs" weight="medium" color={resolution === res.label ? "text" : "textDim"} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Video Area */}
      <View style={$videoContainer}>
        {isStreaming ? (
          <View style={[$videoPlaceholder, { backgroundColor: videoBg }]}>
            <Text text="📹" size="xxl" color="text" />
            <Text text="Live streaming..." size="md" color="textDim" style={$streamText} />
          </View>
        ) : isConnecting ? (
          <View style={[$videoPlaceholder, { backgroundColor: videoBg }]}>
            <Text text="⏳" size="xl" color="textDim" />
            <Text text="Connecting..." size="md" color="textDim" />
          </View>
        ) : (
          <View style={[$videoPlaceholder, { backgroundColor: videoBg }]}>
            <Text text="📷" size="xxl" color="textDim" />
            <Text text="Camera is off" size="md" color="textDim" style={$offlineText} />
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={$actionButtons}>
        <Button text="📸 Snapshot" preset="default" onPress={handleSnapshot} disabled={!isStreaming} style={$actionButton} />
        <Button text={isStreaming ? "⏹ Stop" : "▶️ Start"} preset={isStreaming ? "reversed" : "filled"} onPress={isStreaming ? handleStop : handleStart} style={$actionButton} />
      </View>

      {/* Status Bar */}
      {isStreaming && (
        <View style={$statusBar}>
          <Text text={`${resolution} @ ${stats.fps}fps | ${stats.bitrate}`} size="xs" color="textDim" />
        </View>
      )}
    </Screen>
  )
}

const $segmentedContainer: ViewStyle = { paddingHorizontal: 16, paddingTop: 8 }
const $segmentedControl: ViewStyle = { flexDirection: "row", borderRadius: 8, padding: 2 }
const $segmentButton: ViewStyle = { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, flex: 1, alignItems: "center" }
const $videoContainer: ViewStyle = { aspectRatio: 16 / 9, marginHorizontal: 16, marginTop: 8, borderRadius: 12, overflow: "hidden" }
const $videoPlaceholder: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center" }
const $streamText: TextStyle = { marginTop: 8 }
const $offlineText: TextStyle = { marginTop: 8 }
const $actionButtons: ViewStyle = { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16 }
const $actionButton: ViewStyle = { flex: 1 }
const $statusBar: ViewStyle = { position: "absolute", bottom: 16, left: 0, right: 0, alignItems: "center" }
