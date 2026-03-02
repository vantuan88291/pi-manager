import { FC, useState } from "react"
import { View, ViewStyle, TextStyle, Pressable } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"

type CameraScreenProps = AppStackScreenProps<"Camera">

type Resolution = "480p" | "720p" | "1080p"

const RESOLUTIONS: { label: Resolution; width: number; height: number }[] = [
  { label: "480p", width: 854, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
]

export const CameraScreen: FC<CameraScreenProps> = function CameraScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
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

  const handleStop = () => {
    setIsStreaming(false)
  }

  const handleSnapshot = () => {
    console.log("Snapshot taken")
  }

  const handleResolutionChange = (newRes: Resolution) => {
    setResolution(newRes)
    if (isStreaming) {
      handleStop()
      setTimeout(() => handleStart(), 500)
    }
  }

  return (
    <Screen preset="fixed">
      <Header
        title="Camera"
        titleMode="center"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      {/* Resolution Selector */}
      <View style={themed($segmentedContainer)}>
        <View style={themed($segmentedControl)}>
          {RESOLUTIONS.map((res) => (
            <Pressable
              key={res.label}
              style={[
                themed($segmentButton),
                resolution === res.label && themed($segmentButtonActive)
              ]}
              onPress={() => handleResolutionChange(res.label)}
            >
              <Text
                text={res.label}
                size="xs"
                weight="medium"
                
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Video Area */}
      <View style={themed($videoContainer)}>
        {isStreaming ? (
          <View >
            <Text text="📹" size="xxl" />
            <Text text="Live streaming..." size="md" color="textDim"  />
          </View>
        ) : isConnecting ? (
          <View >
            <Text text="⏳" size="xl" />
            <Text text="Connecting..." size="md" color="textDim" />
          </View>
        ) : (
          <View >
            <Text text="📷" size="xxl" />
            <Text text="Camera is off" size="md" color="textDim"  />
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={themed($actionButtons)}>
        <Button
          text="📸 Snapshot"
          preset="default"
          onPress={handleSnapshot}
          disabled={!isStreaming}
          style={themed($actionButton)}
        />
        <Button
          text={isStreaming ? "⏹ Stop" : "▶️ Start"}
          preset={isStreaming ? "reversed" : "filled"}
          onPress={isStreaming ? handleStop : handleStart}
          style={themed($actionButton)}
        />
      </View>

      {/* Status Bar */}
      {isStreaming && (
        <View style={themed($statusBar)}>
          <Text text={`${resolution} @ ${stats.fps}fps | ${stats.bitrate}`} size="xs" color="textDim" />
        </View>
      )}
    </Screen>
  )
}

const $stickyHeader = { position: "sticky" as any, top: 0, zIndex: 100 }
const $segmentedContainer: ViewStyle = { paddingHorizontal: 16, paddingTop: 8 }
const $segmentedControl: ThemedStyle<ViewStyle> = ({ colors }) => ({ flexDirection: "row", backgroundColor: colors.palette.neutral200, borderRadius: 8, padding: 2 })
const $segmentButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({ paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 6, flex: 1, alignItems: "center" })
const $segmentButtonActive: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.surface })
const $segmentText: ViewStyle = {}

const $videoContainer: ViewStyle = { aspectRatio: 16 / 9, marginHorizontal: 16, marginTop: 8, borderRadius: 12, overflow: "hidden" }
const $videoPlaceholder: ViewStyle = { flex: 1, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" }
const $streamText: ViewStyle = { marginTop: 8 }
const $offlineText: ViewStyle = { marginTop: 8 }

const $actionButtons: ViewStyle = { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16 }
const $actionButton: ViewStyle = { flex: 1 }

const $statusBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ position: "absolute", bottom: spacing.md, left: 0, right: 0, alignItems: "center" })
