import { FC, useState } from "react"
import { View, ViewStyle, Pressable, Switch, TextStyle } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type BluetoothScreenProps = AppStackScreenProps<"Bluetooth">

interface BluetoothDevice {
  mac: string
  name: string | null
  type: "audio" | "input" | "display" | "unknown"
  rssi: number
  paired?: boolean
  connected?: boolean
}

const MOCK_PAIRED_DEVICES: BluetoothDevice[] = [
  { mac: "AA:BB:CC:DD:EE:01", name: "JBL Flip 6", type: "audio", rssi: -42, paired: true, connected: true },
  { mac: "AA:BB:CC:DD:EE:02", name: "Logitech K380", type: "input", rssi: -55, paired: true, connected: false },
]

const MOCK_AVAILABLE_DEVICES: BluetoothDevice[] = [
  { mac: "11:22:33:44:55:01", name: "Sony WH-1000XM4", type: "audio", rssi: -38 },
  { mac: "11:22:33:44:55:02", name: null, type: "unknown", rssi: -72 },
  { mac: "11:22:33:44:55:03", name: "Magic Keyboard", type: "input", rssi: -45 },
]

const getDeviceIcon = (type: string) => {
  switch (type) {
    case "audio": return "🎧"
    case "input": return "⌨️"
    case "display": return "📺"
    default: return "❓"
  }
}

const getRssiColor = (rssi: number) => {
  if (rssi > -50) return "#10B981"
  if (rssi > -70) return "#F59E0B"
  return "#EF4444"
}

export const BluetoothScreen: FC<BluetoothScreenProps> = function BluetoothScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const [isEnabled, setIsEnabled] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>(MOCK_PAIRED_DEVICES)
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>(MOCK_AVAILABLE_DEVICES)

  const handleTogglePower = (value: boolean) => {
    setIsEnabled(value)
    if (!value) {
      setIsScanning(false)
      setAvailableDevices([])
    }
  }

  const handleScan = () => {
    if (!isEnabled) return
    setIsScanning(true)
    setTimeout(() => setIsScanning(false), 5000)
  }

  const handlePair = (device: BluetoothDevice) => {
    const newDevice = { ...device, paired: true }
    setPairedDevices([...pairedDevices, newDevice])
    setAvailableDevices(availableDevices.filter(d => d.mac !== device.mac))
  }

  const renderDeviceItem = (device: BluetoothDevice, isPaired: boolean) => {
    const deviceName = device.name || device.mac
    return (
      <Pressable key={device.mac} style={[themed($deviceItem), isPaired && device.connected && themed($deviceItemConnected)]}>
        <View style={[$deviceIcon, { backgroundColor: theme.colors.palette.neutral200 }]}>
          <Text text={getDeviceIcon(device.type)} size="lg" />
        </View>
        <View style={$deviceCenter}>
          <Text text={deviceName} size="md" weight="medium" color="text" />
          <Text text={`${device.rssi} dBm`} size="xs" color="textDim" style={{ color: getRssiColor(device.rssi) }} />
        </View>
        <View style={$deviceRight}>
          {isPaired && <Text text="✓" size="sm" color="success" />}
          {!isPaired && <Button text="Pair" preset="filled" onPress={() => handlePair(device)} />}
        </View>
      </Pressable>
    )
  }

  if (!isEnabled) {
    return (
      <Screen preset="scroll">
        <Header title="Bluetooth" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <View style={themed($disabledOverlay)}>
          <Text text="🔇" size="xxl" color="text" />
          <Text text="Bluetooth is turned off" size="lg" weight="medium" color="text" style={$disabledTitle} />
          <Text text="Turn on Bluetooth to scan for devices" size="sm" color="textDim" style={$disabledText} />
          <Switch value={isEnabled} onValueChange={handleTogglePower} trackColor={{ false: theme.colors.border, true: theme.colors.tint }} style={$powerSwitch} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <Header title="Bluetooth" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} >

      <SectionHeader title="Paired Devices" style={$sectionHeader} />
      <View style={themed($deviceList)}>
        {pairedDevices.length > 0 ? pairedDevices.map(d => renderDeviceItem(d, true)) : <Text text="No paired devices" size="sm" color="textDim" style={$emptyText} />}
      </View>

      <SectionHeader title="Available Devices" rightAction={{ label: isScanning ? "Scanning..." : "Scan", onPress: handleScan }} style={$sectionHeader} />
      <View style={themed($deviceList)}>
        {availableDevices.length > 0 ? availableDevices.map(d => renderDeviceItem(d, false)) : <Text text={isScanning ? "Scanning..." : "No devices found"} size="sm" color="textDim" style={$emptyText} />}
      </View>
    </Screen>
  )
}

const $sectionHeader: ViewStyle = { marginHorizontal: 16, marginTop: 16, marginBottom: 8 }
const $deviceList: ViewStyle = { marginHorizontal: 16, borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF" }
const $deviceItem: ViewStyle = { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }
const $deviceItemConnected: ViewStyle = { backgroundColor: "#D1FAE5" }
const $deviceIcon: ViewStyle = { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $deviceCenter: ViewStyle = { flex: 1 }
const $deviceRight: ViewStyle = { alignItems: "flex-end", gap: 4 }

const $disabledOverlay: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }
const $disabledTitle: TextStyle = { marginTop: 16, marginBottom: 8 }
const $disabledText: TextStyle = { marginBottom: 24 }
const $powerSwitch: ViewStyle = { marginTop: 16 }

const $emptyText: TextStyle = { textAlign: "center", padding: 20 }
