import { FC, useState } from "react"
import { View, ViewStyle, TextStyle, FlatList, Pressable, Switch } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { SectionHeader } from "@/components/SectionHeader"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"

type BluetoothScreenProps = AppStackScreenProps<"Bluetooth">

interface BluetoothDevice {
  mac: string
  name: string | null
  type: "audio" | "input" | "display" | "unknown"
  rssi: number // dBm
  paired?: boolean
  connected?: boolean
}

// Mock data
const MOCK_PAIRED_DEVICES: BluetoothDevice[] = [
  { mac: "AA:BB:CC:DD:EE:01", name: "JBL Flip 6", type: "audio", rssi: -42, paired: true, connected: true },
  { mac: "AA:BB:CC:DD:EE:02", name: "Logitech K380", type: "input", rssi: -55, paired: true, connected: false },
]

const MOCK_AVAILABLE_DEVICES: BluetoothDevice[] = [
  { mac: "11:22:33:44:55:01", name: "Sony WH-1000XM4", type: "audio", rssi: -38 },
  { mac: "11:22:33:44:55:02", name: null, type: "unknown", rssi: -72 },
  { mac: "11:22:33:44:55:03", name: "Magic Keyboard", type: "input", rssi: -45 },
  { mac: "11:22:33:44:55:04", name: "Samsung TV", type: "display", rssi: -65 },
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
    setTimeout(() => {
      setIsScanning(false)
    }, 5000)
  }

  const handlePair = (device: BluetoothDevice) => {
    const newDevice = { ...device, paired: true }
    setPairedDevices([...pairedDevices, newDevice])
    setAvailableDevices(availableDevices.filter(d => d.mac !== device.mac))
  }

  const handleDisconnect = (device: BluetoothDevice) => {
    setPairedDevices(pairedDevices.map(d => 
      d.mac === device.mac ? { ...d, connected: false } : d
    ))
  }

  const handleUnpair = (device: BluetoothDevice) => {
    setPairedDevices(pairedDevices.filter(d => d.mac !== device.mac))
  }

  const renderDeviceItem = (device: BluetoothDevice, isPaired: boolean) => {
    const deviceName = device.name || device.mac
    
    return (
      <Pressable
        key={device.mac}
        style={[themed($deviceItem), isPaired && device.connected && themed($deviceItemConnected)]}
      >
        <View style={[$deviceIcon, { backgroundColor: theme.colors.palette.neutral200 }]}>
          <Text text={getDeviceIcon(device.type)} size="lg" />
        </View>
        
        <View style={$deviceCenter}>
          <Text text={deviceName} size="md" weight="medium" />
          <Text text={`${device.rssi} dBm`} size="xs" style={{ color: getRssiColor(device.rssi) }} />
        </View>
        
        <View style={$deviceRight}>
          {isPaired && (
            <>
              <Text text="✓" size="sm" color="success" />
              {device.connected && (
                <View style={themed($connectedBadge)}>
                  <Text text="Connected" size="xs" color="success" />
                </View>
              )}
              {!device.connected && (
                <Button
                  text="Connect"
                  preset="default"
                  onPress={() => handlePair(device)}
                />
              )}
            </>
          )}
          {!isPaired && (
            <Button
              text="Pair"
              preset="filled"
              onPress={() => handlePair(device)}
            />
          )}
        </View>
      </Pressable>
    )
  }

  if (!isEnabled) {
    return (
      <Screen preset="scroll">
        <Header title="Bluetooth" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />
        
        <View style={themed($disabledOverlay)}>
          <Text text="🔇" size="xxl" />
          <Text text="Bluetooth is turned off" size="lg" weight="medium"  />
          <Text text="Turn on Bluetooth to scan for devices" size="sm" color="textDim"  />
          <Switch
            value={isEnabled}
            onValueChange={handleTogglePower}
            trackColor={{ false: theme.colors.border, true: theme.colors.tint }}
            style={$powerSwitch}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <Header
        title="Bluetooth"
        titleMode="center"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        
        onRightPress={() => handleTogglePower(!isEnabled)}
      />

      {/* Connected Devices */}
      {pairedDevices.filter(d => d.connected).length > 0 && (
        <>
          <SectionHeader title="Connected Devices" />
          <View style={themed($deviceList)}>
            {pairedDevices.filter(d => d.connected).map(d => renderDeviceItem(d, true))}
          </View>
        </>
      )}

      {/* Paired Devices */}
      <SectionHeader title="Paired Devices" />
      <View style={themed($deviceList)}>
        {pairedDevices.length > 0 ? (
          pairedDevices.map(d => renderDeviceItem(d, true))
        ) : (
          <Text text="No paired devices" size="sm" color="textDim"  />
        )}
      </View>

      {/* Available Devices */}
      <SectionHeader
        title="Available Devices"
        rightAction={{
          label: isScanning ? "Scanning..." : "Scan",
          onPress: handleScan,
        }}
      />
      
      <View style={themed($deviceList)}>
        {availableDevices.length > 0 ? (
          availableDevices.map(d => renderDeviceItem(d, false))
        ) : (
          <View style={themed($emptyContainer)}>
            <Text text={isScanning ? "Scanning for devices..." : "No devices found. Try scanning again."} size="sm" color="textDim"  />
          </View>
        )}
      </View>
    </Screen>
  )
}

const $deviceList: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: spacing.md, overflow: "hidden" })
const $deviceItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border })
const $deviceItemConnected: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.success + "10" })
const $deviceIcon: ViewStyle = { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $deviceCenter: ViewStyle = { flex: 1 }
const $deviceRight: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $connectedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 })

const $disabledOverlay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl })
const $disabledTitle: ThemedStyle<ViewStyle> = ({ colors }) => ({ color: colors.text, marginTop: 16, marginBottom: 8 })
const $disabledText: ThemedStyle<ViewStyle> = ({ colors }) => ({ color: colors.textDim, marginBottom: 24 })
const $powerSwitch: ViewStyle = { marginTop: 16 }

const $emptyContainer: ViewStyle = { padding: 20 }
const $emptyText: TextStyle = { color: "#64748B", textAlign: "center" }
