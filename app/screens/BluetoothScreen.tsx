import { FC, useState, useEffect } from "react"
import { View, ViewStyle, FlatList, ActivityIndicator, Alert, TextStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { SectionHeader } from "@/components/SectionHeader"
import { Switch } from "@/components/Switch"
import { TextField } from "@/components/TextField"
import { ActionModal } from "@/components/ActionModal"
import { useAppTheme } from "@/theme/context"
import { getFeatureColor } from "@/theme/featureColors"
import { useSocket } from "@/services/socket/SocketContext"
import { bluetoothClientModule } from "@/services/socket/modules/bluetooth"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { BluetoothDevice, BluetoothStatus } from "../../../shared/types/bluetooth"

type BluetoothScreenProps = AppStackScreenProps<"Bluetooth">

export const BluetoothScreen: FC<BluetoothScreenProps> = function BluetoothScreen({ navigation }) {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { accent: btAccent } = getFeatureColor("bluetooth", theme.isDark)
  const { subscribeToModule, unsubscribeFromModule } = useSocket()
  
  const [bluetoothStatus, setBluetoothStatus] = useState<BluetoothStatus | null>(null)
  const [isPowered, setIsPowered] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showPairSheet, setShowPairSheet] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [pin, setPin] = useState("")
  const [pairError, setPairError] = useState<string | null>(null)
  const [isPairing, setIsPairing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Subscribe to Bluetooth module
  useEffect(() => {
    subscribeToModule("bluetooth")
    
    const unsubStatus = bluetoothClientModule.onStatus((status) => {
      setBluetoothStatus(status)
      setIsPowered(status.powered)
      setIsDiscovering(status.discovering)
      setDevices(status.devices || [])
    })
    
    return () => {
      unsubStatus()
      unsubscribeFromModule("bluetooth")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const handleTogglePower = async () => {
    console.log("[BluetoothScreen] toggle power, current:", isPowered)
    const newPowerState = !isPowered
    const result = await bluetoothClientModule.togglePower(newPowerState)
    
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const handleScan = async () => {
    if (!isPowered) {
      Alert.alert(t("bluetooth:powerOff"), t("bluetooth:turnOnToScan"))
      return
    }
    
    setIsScanning(true)
    setDevices([])
    
    const result = await bluetoothClientModule.startScan()
    
    if (!result.success) {
      setIsScanning(false)
      Alert.alert(t("common:error"), result.error)
    }
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      setIsScanning(false)
      bluetoothClientModule.stopScan()
    }, 10000)
  }

  const handleStopScan = () => {
    setIsScanning(false)
    bluetoothClientModule.stopScan()
  }

  const handleDevicePress = (device: BluetoothDevice) => {
    if (device.connected) {
      // Show disconnect/unpair options
      Alert.alert(
        device.name || device.mac,
        t("bluetooth:deviceOptions"),
        [
          { text: t("bluetooth:disconnect"), onPress: () => handleDisconnect(device) },
          { text: t("bluetooth:unpair"), style: "destructive", onPress: () => handleUnpair(device) },
          { text: t("common:cancel"), style: "cancel" },
        ]
      )
    } else if (device.paired) {
      // Connect to paired device
      handleConnect(device)
    } else {
      // Show pair modal
      setSelectedDevice(device)
      setShowPairSheet(true)
      setPairError(null)
      setPin("")
    }
  }

  const handlePair = async () => {
    if (!selectedDevice) return
    setIsPairing(true)
    setPairError(null)
    
    const result = await bluetoothClientModule.pair(
      selectedDevice.mac,
      pin || undefined
    )
    
    setIsPairing(false)
    
    if (result.success) {
      setShowPairSheet(false)
      setPin("")
      // Auto-connect after pairing
      handleConnect(selectedDevice)
    } else {
      setPairError(result.error || t("bluetooth:errors.pairingFailed"))
    }
  }

  const handleConnect = async (device: BluetoothDevice) => {
    setIsConnecting(true)
    const result = await bluetoothClientModule.connect(device.mac)
    setIsConnecting(false)
    
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const handleDisconnect = async (device: BluetoothDevice) => {
    const result = await bluetoothClientModule.disconnect(device.mac)
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const handleUnpair = async (device: BluetoothDevice) => {
    const result = await bluetoothClientModule.unpair(device.mac)
    if (!result.success) {
      Alert.alert(t("common:error"), result.error)
    }
  }

  const getDeviceTypeIcon = (type: string | null): string => {
    switch (type) {
      case "audio": return "🎧"
      case "input": return "⌨️"
      case "display": return "🖥️"
      default: return "📱"
    }
  }

  const getRSSIColor = (rssi: number | null): string => {
    if (!rssi) return theme.colors.textDim
    if (rssi > -50) return theme.colors.success
    if (rssi > -70) return theme.colors.warning
    return theme.colors.error
  }

  const getRSSILabel = (rssi: number | null): string => {
    if (!rssi) return ""
    if (rssi > -50) return t("bluetooth:signal.excellent")
    if (rssi > -70) return t("bluetooth:signal.good")
    return t("bluetooth:signal.weak")
  }

  const renderDeviceItem = ({ item }: { item: BluetoothDevice }) => {
    const isConnected = item.connected
    const isPaired = item.paired
    
    return (
      <View style={themed($deviceItem)}>
        <View style={$deviceIcon}>
          <Text text={getDeviceTypeIcon(item.type)} size="xl" />
        </View>
        
        <View style={$deviceInfo}>
          <Text text={item.name || item.mac} weight="medium" color="text" />
          <View style={$deviceMeta}>
            {item.rssi !== null && (
              <Text 
                text={`${item.rssi} dBm • ${getRSSILabel(item.rssi)}`} 
                size="xs" 
                color={getRSSIColor(item.rssi)} 
              />
            )}
            {isPaired && !isConnected && (
              <Text tx="bluetooth:paired" size="xs" color="textDim" style={{ marginLeft: 6 }} />
            )}
          </View>
        </View>
        
        <View style={$deviceRight}>
          {isConnected && (
            <View style={themed($connectedBadge)}>
              <Text tx="bluetooth:connected" size="xs" color="success" weight="medium" />
            </View>
          )}
          {isPaired && !isConnected && (
            <View style={themed($pairedBadge)}>
              <Text tx="bluetooth:paired" size="xs" color="textDim" />
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <Screen preset="scroll">
      <Header titleTx="bluetooth:title" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Power Toggle */}
      <View style={themed($card)}>
        <View style={$powerRow}>
          <View>
            <Text tx="bluetooth:power" weight="medium" color="text" size="md" />
            <Text 
              tx={isPowered ? "bluetooth:on" : "bluetooth:off"} 
              size="sm" 
              color={isPowered ? "success" : "textDim"} 
            />
          </View>
          <Switch value={isPowered} onValueChange={handleTogglePower} />
        </View>
      </View>

      {/* Connected Devices */}
      {devices.some(d => d.connected) && (
        <>
          <SectionHeader titleTx="bluetooth:connectedDevices" style={themed($sectionHeader)} />
          <View style={themed($card)}>
            {devices
              .filter(d => d.connected)
              .map((device) => renderDeviceItem({ item: device }))
            }
          </View>
        </>
      )}

      {/* Paired Devices */}
      {devices.some(d => d.paired && !d.connected) && (
        <>
          <SectionHeader titleTx="bluetooth:pairedDevices" style={themed($sectionHeader)} />
          <View style={themed($card)}>
            {devices
              .filter(d => d.paired && !d.connected)
              .map((device) => renderDeviceItem({ item: device }))
            }
          </View>
        </>
      )}

      {/* Available Devices */}
      <SectionHeader 
        titleTx="bluetooth:availableDevices" 
        rightActionTx={isScanning ? "bluetooth:stop" : "bluetooth:scan"}
        onRightAction={isScanning ? handleStopScan : handleScan}
        style={themed($sectionHeader)} 
      />
      
      {isScanning && (
        <View style={$scanning}>
          <ActivityIndicator size="small" color={btAccent} />
          <Text tx="bluetooth:scanning" size="sm" color="textDim" style={{ marginLeft: 8 }} />
        </View>
      )}
      
      <View style={themed($card)}>
        {!isPowered ? (
          <View style={$emptyState}>
            <Text text="📴" size="xl" />
            <Text tx="bluetooth:turnOnToScan" size="sm" color="textDim" style={{ marginTop: 8 }} />
          </View>
        ) : devices.filter(d => !d.paired && !d.connected).length === 0 && !isScanning ? (
          <View style={$emptyState}>
            <Text text="📡" size="xl" />
            <Text tx="bluetooth:noDevices" size="sm" color="textDim" style={{ marginTop: 8 }} />
            <Button tx="bluetooth:scan" preset="default" onPress={handleScan} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <FlatList
            data={devices.filter(d => !d.paired && !d.connected)}
            keyExtractor={(item) => item.mac}
            renderItem={renderDeviceItem}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Pair Modal */}
      <ActionModal
        visible={showPairSheet}
        onClose={() => {
          setShowPairSheet(false)
          setPairError(null)
          setPin("")
        }}
        title={selectedDevice?.name || selectedDevice?.mac || ""}
      >
        <View style={{ gap: 16 }}>
          <Text tx="bluetooth:enterPin" size="sm" color="textDim" />
          
          <TextField
            labelTx="bluetooth:pin"
            value={pin}
            onChangeText={setPin}
            placeholderTx="bluetooth:pinPlaceholder"
            keyboardType="number-pad"
            autoFocus
          />
          
          {pairError && (
            <Text text={pairError} size="sm" color="error" />
          )}
          
          <Button
            tx={isPairing ? "bluetooth:pairing" : "bluetooth:pair"}
            preset="filled"
            onPress={handlePair}
            disabled={isPairing}
          />
        </View>
      </ActionModal>
    </Screen>
  )
}

const $card: ViewStyle = { backgroundColor: "transparent", paddingHorizontal: 16, marginBottom: 16 }
const $powerRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }
const $sectionHeader: ViewStyle = { paddingHorizontal: 16, marginTop: 8 }
const $scanning: ViewStyle = { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }
const $emptyState: ViewStyle = { alignItems: "center", paddingVertical: 32 }
const $deviceItem: ViewStyle = { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" }
const $deviceIcon: ViewStyle = { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center", marginRight: 12 }
const $deviceInfo: ViewStyle = { flex: 1 }
const $deviceMeta: ViewStyle = { flexDirection: "row", alignItems: "center", marginTop: 4 }
const $deviceRight: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }
const $connectedBadge: ViewStyle = { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(16, 185, 129, 0.1)" }
const $pairedBadge: ViewStyle = { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)" }
