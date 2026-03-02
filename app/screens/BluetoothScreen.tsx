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

const MOCK_PAIRED: BluetoothDevice[] = [
  { mac: "AA:BB:CC:DD:EE:01", name: "JBL Flip 6", type: "audio", rssi: -42, paired: true, connected: true },
  { mac: "AA:BB:CC:DD:EE:02", name: "Logitech K380", type: "input", rssi: -55, paired: true, connected: false },
]

const MOCK_AVAILABLE: BluetoothDevice[] = [
  { mac: "11:22:33:44:55:01", name: "Sony WH-1000XM4", type: "audio", rssi: -38 },
  { mac: "11:22:33:44:55:02", name: null, type: "unknown", rssi: -72 },
  { mac: "11:22:33:44:55:03", name: "Magic Keyboard", type: "input", rssi: -45 },
]

const getIcon = (t: string) => t === "audio" ? "🎧" : t === "input" ? "⌨️" : t === "display" ? "📺" : "❓"
const getRssiColor = (r: number) => r > -50 ? "#10B981" : r > -70 ? "#F59E0B" : "#EF4444"

export const BluetoothScreen: FC<BluetoothScreenProps> = ({ navigation }) => {
  const { themed, theme } = useAppTheme()
  const [enabled, setEnabled] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [paired, setPaired] = useState(MOCK_PAIRED)
  const [available, setAvailable] = useState(MOCK_AVAILABLE)

  const togglePower = (v: boolean) => {
    setEnabled(v)
    if (!v) { setScanning(false); setAvailable([]) }
  }

  const startScan = () => { if (!enabled) return; setScanning(true); setTimeout(() => setScanning(false), 5000) }
  const doPair = (d: BluetoothDevice) => { setPaired([...paired, { ...d, paired: true }]); setAvailable(available.filter(x => x.mac !== d.mac)) }

  const renderItem = (d: BluetoothDevice, isPaired: boolean) => (
    <Pressable key={d.mac} style={[themed($item), isPaired && d.connected && themed($itemConnected)]}>
      <View style={[$icon, { backgroundColor: theme.colors.palette.neutral200 }]}><Text text={getIcon(d.type)} size="lg" /></View>
      <View style={$center}><Text text={d.name || d.mac} size="md" weight="medium" color="text" /><Text text={`${d.rssi} dBm`} size="xs" color="textDim" style={{ color: getRssiColor(d.rssi) }} /></View>
      <View style={$right}>{isPaired && <Text text="✓" size="sm" color="success" />}{!isPaired && <Button text="Pair" preset="filled" onPress={() => doPair(d)} />}</View>
    </Pressable>
  )

  if (!enabled) {
    return (
      <Screen preset="scroll">
        <Header title="Bluetooth" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />
        <View style={themed($disabled)}>
          <Text text="🔇" size="xxl" color="text" />
          <Text text="Bluetooth is turned off" size="lg" weight="medium" color="text" style={$disabledTitle} />
          <Text text="Turn on to scan for devices" size="sm" color="textDim" style={$disabledText} />
          <Switch value={enabled} onValueChange={togglePower} trackColor={{ false: theme.colors.border, true: theme.colors.tint }} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll">
      <Header title="Bluetooth" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />
      <SectionHeader title="Paired Devices" style={$section} />
      <View style={themed($list)}>{paired.length ? paired.map(d => renderItem(d, true)) : <Text text="No paired devices" size="sm" color="textDim" style={$empty} />}</View>
      <SectionHeader title="Available Devices" rightAction={{ label: scanning ? "Scanning..." : "Scan", onPress: startScan }} style={$section} />
      <View style={themed($list)}>{available.length ? available.map(d => renderItem(d, false)) : <Text text={scanning ? "Scanning..." : "No devices found"} size="sm" color="textDim" style={$empty} />}</View>
    </Screen>
  )
}

const $section: ViewStyle = { marginHorizontal: 16, marginTop: 16, marginBottom: 8 }
const $list: ViewStyle = { marginHorizontal: 16, borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF" }
const $item: ViewStyle = { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }
const $itemConnected: ViewStyle = { backgroundColor: "#D1FAE5" }
const $icon: ViewStyle = { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }
const $center: ViewStyle = { flex: 1 }
const $right: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $empty: TextStyle = { textAlign: "center", padding: 20 }
const $disabled: ViewStyle = { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }
const $disabledTitle: TextStyle = { marginTop: 16, marginBottom: 8 }
const $disabledText: TextStyle = { marginBottom: 24 }
