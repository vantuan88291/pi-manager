import { FC, useState } from "react"
import { View, ViewStyle, Pressable, TextStyle } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type AudioScreenProps = AppStackScreenProps<"Audio">

const MOCK_DEVICES = [
  { id: "hdmi", name: "HDMI", icon: "📺" },
  { id: "jack", name: "3.5mm Jack", icon: "🎧" },
  { id: "bt", name: "JBL Flip 6", icon: "🔊" },
]

export const AudioScreen: FC<AudioScreenProps> = function AudioScreen({ navigation }) {
  const { theme } = useAppTheme()
  const [volume, setVolume] = useState(72)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState("hdmi")
  const [sliderValue, setSliderValue] = useState(volume)

  const handleVolumeComplete = (value: number) => setVolume(value)
  const handleMuteToggle = () => setIsMuted(!isMuted)
  const handleDeviceSelect = (id: string) => setSelectedDevice(id)

  const VolumeSlider = ({ value, disabled }: { value: number; disabled?: boolean }) => {
    const pct = Math.max(0, Math.min(100, value))
    const trackColor = disabled ? theme.colors.border : theme.colors.palette?.neutral300 || "#E2E8F0"
    const fillColor = disabled ? theme.colors.textDim : theme.colors.tint
    
    return (
      <View style={$sliderContainer}>
        <Text text="🔊" size="lg" color="text" />
        <Pressable style={[$sliderTrack, { backgroundColor: trackColor }]} onPress={(e) => {
          const newVal = Math.round((e.nativeEvent.locationX / 280) * 100)
          handleVolumeComplete(Math.max(0, Math.min(100, newVal)))
        }}>
          <View style={[$sliderFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
          <View style={[$sliderThumb, { left: `${pct}%`, backgroundColor: fillColor }]} />
        </Pressable>
        <Text text="🔊" size="lg" color="text" />
      </View>
    )
  }

  return (
    <Screen preset="fixed">
      <Header title="Audio" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      <View style={$content}>
        <Card 
          heading="Volume"
          ContentComponent={
            <>
              <VolumeSlider value={isMuted ? 0 : sliderValue} disabled={isMuted} />
              <Text text={isMuted ? "Muted" : `${sliderValue}%`} size="xl" weight="bold" color="text" style={$volumeText} />
              <Button text={isMuted ? "Unmute" : "Mute"} preset="default" onPress={handleMuteToggle} style={$muteButton} />
            </>
          }
          style={$card}
        />

        <Card 
          heading="Output Device"
          ContentComponent={
            <View style={$deviceList}>
              {MOCK_DEVICES.map((device) => (
                <Pressable key={device.id} style={[$deviceItem, selectedDevice === device.id && { borderColor: theme.colors.tint, backgroundColor: theme.colors.tint + "15" }]} onPress={() => handleDeviceSelect(device.id)}>
                  <Text text={device.icon} size="lg" />
                  <Text text={device.name} size="md" weight="medium" color="text" style={$deviceName} />
                  <View style={[$radioIndicator, selectedDevice === device.id && { borderColor: theme.colors.tint }]}>
                    {selectedDevice === device.id && <View style={[$radioInner, { backgroundColor: theme.colors.tint }]} />}
                  </View>
                </Pressable>
              ))}
            </View>
          }
          style={$card}
        />

        <Button text="Test Sound" preset="filled" onPress={() => {}} style={$testButton} />
      </View>
    </Screen>
  )
}

const $content: ViewStyle = { flex: 1, paddingHorizontal: 16 }
const $card: ViewStyle = { marginBottom: 16 }
const $sliderContainer: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }
const $sliderTrack: ViewStyle = { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" }
const $sliderFill: ViewStyle = { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3 }
const $sliderThumb: ViewStyle = { position: "absolute", top: -9, width: 24, height: 24, borderRadius: 12, marginLeft: -12 }
const $volumeText: TextStyle = { textAlign: "center", marginBottom: 16 }
const $muteButton: ViewStyle = { alignSelf: "center" }
const $deviceList: ViewStyle = { gap: 12 }
const $deviceItem: ViewStyle = { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" }
const $deviceName: TextStyle = { flex: 1, marginLeft: 12 }
const $radioIndicator: ViewStyle = { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }
const $radioInner: ViewStyle = { width: 12, height: 12, borderRadius: 6 }
const $testButton: ViewStyle = { marginTop: 8 }
