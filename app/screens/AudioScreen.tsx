import { FC, useState, useEffect } from "react"
import { View, ViewStyle, Alert } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { getFeatureColor } from "@/theme/featureColors"
import { useSocket } from "@/services/socket/SocketContext"
import { audioClientModule } from "@/services/socket/modules/audio"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { AudioDevice } from "../../../shared/types/audio"

type AudioScreenProps = AppStackScreenProps<"Audio">

export const AudioScreen: FC<AudioScreenProps> = function AudioScreen({ navigation }) {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { accent: audioAccent } = getFeatureColor("audio", theme.isDark)
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const [volume, setVolume] = useState(0)
  const [muted, setMuted] = useState(false)
  const [outputDevice, setOutputDevice] = useState<AudioDevice | null>(null)
  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [isChangingVolume, setIsChangingVolume] = useState(false)

  // Subscribe to Audio module
  useEffect(() => {
    subscribeToModule("audio")
    
    const unsubStatus = audioClientModule.onStatus((status) => {
      setVolume(status.volume)
      setMuted(status.muted)
      setOutputDevice(status.outputDevice)
      setAvailableDevices(status.availableDevices || [])
    })
    
    return () => {
      unsubStatus()
      unsubscribeFromModule("audio")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const handleVolumeChange = async (newVolume: number) => {
    if (isChangingVolume) return
    setIsChangingVolume(true)
    
    const clampedVolume = Math.max(0, Math.min(100, newVolume))
    const result = await audioClientModule.setVolume(clampedVolume)
    
    setIsChangingVolume(false)
    
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const handleMuteToggle = async () => {
    const result = await audioClientModule.toggleMute()
    
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const handleTestSound = async () => {
    setIsTesting(true)
    const result = await audioClientModule.testSound()
    setIsTesting(false)
    
    if (!result.success) {
      Alert.alert(t("audio:testFailed"), result.error)
    }
  }

  const handleDeviceChange = async (device: AudioDevice) => {
    const result = await audioClientModule.setOutputDevice(device.id)
    
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const getVolumeIcon = (vol: number) => {
    if (vol === 0 || muted) return "🔇"
    if (vol < 40) return "🔈"
    if (vol < 80) return "🔉"
    return "🔊"
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "speaker": return "🔊"
      case "headphone": return "🎧"
      case "hdmi": return "📺"
      case "bluetooth": return "🔵"
      default: return "🔊"
    }
  }

  return (
    <Screen preset="fixed">
      <Header titleTx="audio:title" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Volume Control */}
      <View style={themed($card)}>
        <View style={$volumeHeader}>
          <Text text={getVolumeIcon(volume)} size="xl" />
          <View style={$volumeInfo}>
            <Text tx="audio:volume" weight="medium" color="text" size="md" />
            <Text text={`${muted ? t("audio:muted") : `${volume}%`}`} size="sm" color={muted ? "textDim" : "text"} />
          </View>
        </View>
        
        {/* Volume Slider */}
        <View style={$sliderContainer}>
          <View style={$sliderTrack}>
            <View style={[$sliderFill, { width: `${muted ? 0 : volume}%`, backgroundColor: audioAccent }]} />
          </View>
          <View style={$sliderButtons}>
            <Button 
              tx="audio:decrease" 
              preset="default" 
              onPress={() => handleVolumeChange(volume - 5)}
              disabled={isChangingVolume || volume <= 0}
              style={$sliderButton}
            />
            <Button 
              tx="audio:increase" 
              preset="default" 
              onPress={() => handleVolumeChange(volume + 5)}
              disabled={isChangingVolume || volume >= 100}
              style={$sliderButton}
            />
          </View>
        </View>
        
        {/* Mute Button */}
        <Button 
          tx={muted ? "audio:unmute" : "audio:mute"} 
          preset={muted ? "default" : "reversed"} 
          onPress={handleMuteToggle}
          style={{ marginTop: 16 }}
        />
      </View>

      {/* Output Device */}
      <View style={themed([$card, $section])}>
        <Text tx="audio:outputDevice" weight="medium" color="text" size="md" style={{ marginBottom: 12 }} />
        
        {availableDevices.map((device) => (
          <View
            key={device.id}
            style={themed([$deviceRow, outputDevice?.id === device.id && $deviceRowSelected])}
          >
            <View style={$deviceLeft}>
              <Text text={getDeviceIcon(device.type)} size="lg" />
              <View style={$deviceInfo}>
                <Text text={device.name} weight="medium" color="text" />
                <Text text={device.type} size="xs" color="textDim" />
              </View>
            </View>
            
            {outputDevice?.id === device.id && (
              <View style={themed($selectedBadge)}>
                <Text tx="audio:selected" size="xs" color="success" weight="medium" />
              </View>
            )}
            
            {outputDevice?.id !== device.id && (
              <Button
                tx="audio:select"
                preset="default"
                onPress={() => handleDeviceChange(device)}
                style={$selectButton}
              />
            )}
          </View>
        ))}
        
        {availableDevices.length === 0 && (
          <View style={$emptyState}>
            <Text text="🔊" size="xl" />
            <Text tx="audio:noDevices" size="sm" color="textDim" style={{ marginTop: 8 }} />
          </View>
        )}
      </View>

      {/* Test Sound */}
      <View style={themed([$card, $section])}>
        <Button
          tx={isTesting ? "audio:testing" : "audio:testSound"}
          preset="filled"
          onPress={handleTestSound}
          disabled={isTesting}
        />
        <Text tx="audio:testHint" size="xs" color="textDim" style={{ marginTop: 8, textAlign: "center" }} />
      </View>
    </Screen>
  )
}

const $card: ViewStyle = { backgroundColor: "transparent", paddingHorizontal: 16, marginBottom: 16 }
const $section: ViewStyle = { marginTop: 8 }
const $volumeHeader: ViewStyle = { flexDirection: "row", alignItems: "center", marginBottom: 16 }
const $volumeInfo: ViewStyle = { marginLeft: 12, flex: 1 }
const $sliderContainer: ViewStyle = { gap: 12 }
const $sliderTrack: ViewStyle = { height: 8, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.1)", overflow: "hidden" }
const $sliderFill: ViewStyle = { height: "100%", borderRadius: 4 }
const $sliderButtons: ViewStyle = { flexDirection: "row", gap: 12 }
const $sliderButton: ViewStyle = { flex: 1 }
const $deviceRow: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }
const $deviceRowSelected: ViewStyle = { backgroundColor: "rgba(16, 185, 129, 0.05)", borderRadius: 8, paddingHorizontal: 8 }
const $deviceLeft: ViewStyle = { flexDirection: "row", alignItems: "center", flex: 1 }
const $deviceInfo: ViewStyle = { marginLeft: 12 }
const $selectedBadge: ViewStyle = { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(16, 185, 129, 0.1)" }
const $selectButton: ViewStyle = { paddingHorizontal: 16 }
const $emptyState: ViewStyle = { alignItems: "center", paddingVertical: 24 }
