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

interface AudioDevice {
  id: string
  name: string
  type: "hdmi" | "jack" | "bluetooth" | "usb"
  icon: string
}

const MOCK_DEVICES: AudioDevice[] = [
  { id: "hdmi", name: "HDMI", type: "hdmi", icon: "📺" },
  { id: "jack", name: "3.5mm Jack", type: "jack", icon: "🎧" },
  { id: "bt", name: "JBL Flip 6", type: "bluetooth", icon: "🔊" },
]

export const AudioScreen: FC<AudioScreenProps> = function AudioScreen({ navigation }) {
  const { theme } = useAppTheme()
  const [volume, setVolume] = useState(72)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState("hdmi")

  const [sliderValue, setSliderValue] = useState(volume)

  const handleVolumeComplete = (value: number) => {
    setVolume(value)
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId)
  }

  const handleTestSound = () => {
    // Mock
  }

  const VolumeSlider = ({ value, disabled }: {
    value: number
    disabled?: boolean
  }) => {
    const percentage = Math.max(0, Math.min(100, value))
    
    return (
      <View style={$sliderContainer}>
        <Text text="🔊" size="lg" />
        <Pressable style={[$sliderTrack, { backgroundColor: disabled ? theme.colors.border : theme.colors.palette.neutral300 }]} onPress={(e) => {
          const { locationX } = e.nativeEvent
          const newValue = Math.round((locationX / 280) * 100)
          handleVolumeComplete(Math.max(0, Math.min(100, newValue)))
        }}>
          <View
            style={[
              $sliderFill,
              { width: `${percentage}%`, backgroundColor: disabled ? theme.colors.textDim : theme.colors.tint }
            ]}
          />
          <View
            style={[
              $sliderThumb,
              { left: `${percentage}%`, backgroundColor: disabled ? theme.colors.textDim : theme.colors.tint }
            ]}
          />
        </Pressable>
        <Text text="🔊" size="lg" />
      </View>
    )
  }

  return (
    <Screen preset="fixed">
      <Header title="Audio" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Volume Control */}
      <Card style={$card}>
        <Text text="Volume" size="lg" weight="semiBold" style={$cardTitle} color="text" />
        
        <VolumeSlider
          value={isMuted ? 0 : sliderValue}
          disabled={isMuted}
        />
        
        <Text
          text={isMuted ? "Muted" : `${sliderValue}%`}
          size="xl"
          weight="bold"
          style={$volumeText}
        />
        
        <Button
          text={isMuted ? "Unmute" : "Mute"}
          preset="default"
          onPress={handleMuteToggle}
          style={$muteButton}
        />
      </Card>

      {/* Output Device */}
      <Card style={$card}>
        <Text text="Output Device" size="lg" weight="semiBold" style={$cardTitle} color="text" />
        
        <View style={$deviceList}>
          {MOCK_DEVICES.map((device) => (
            <Pressable
              key={device.id}
              style={[
                $deviceItem,
                selectedDevice === device.id && $deviceItemSelected
              ]}
              onPress={() => handleDeviceSelect(device.id)}
            >
              <View style={$deviceIconContainer}>
                <Text text={device.icon} size="lg" />
              </View>
              <Text text={device.name} size="md" weight="medium" style={$deviceName} color="text" />
              <View style={[
                $radioIndicator,
                selectedDevice === device.id && $radioSelected
              ]}>
                {selectedDevice === device.id && <View style={$radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Test Sound */}
      <Button
        text="Test Sound"
        preset="filled"
        onPress={handleTestSound}
        style={$testButton}
      />
    </Screen>
  )
}

const $card: ViewStyle = { marginHorizontal: 16, marginBottom: 16 }
const $cardTitle: TextStyle = { marginBottom: 16 }
const $volumeText: TextStyle = { textAlign: "center", marginBottom: 16 }

const $sliderContainer: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }
const $sliderTrack: ViewStyle = { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" }
const $sliderFill: ViewStyle = { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3 }
const $sliderThumb: ViewStyle = { position: "absolute", top: -9, width: 24, height: 24, borderRadius: 12, marginLeft: -12 }

const $muteButton: ViewStyle = { alignSelf: "center" }

const $deviceList: ViewStyle = { gap: 8 }
const $deviceItem: ViewStyle = { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" }
const $deviceItemSelected: ViewStyle = { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" }
const $deviceIconContainer: ViewStyle = { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $deviceName: TextStyle = { flex: 1 }

const $radioIndicator: ViewStyle = { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }
const $radioSelected: ViewStyle = { borderColor: "#3B82F6" }
const $radioInner: ViewStyle = { width: 12, height: 12, borderRadius: 6, backgroundColor: "#3B82F6" }

const $testButton: ViewStyle = { marginHorizontal: 16, marginTop: 8 }
