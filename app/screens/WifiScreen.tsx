import { FC, useState } from "react"
import { View, ViewStyle, TextStyle, FlatList, Pressable, ActivityIndicator, Modal, TouchableOpacity } from "react-native"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { SectionHeader } from "@/components/SectionHeader"
import { ProgressBar } from "@/components/ProgressBar"
import { useAppTheme } from "@/theme/context"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { ThemedStyle } from "@/theme/types"

type WifiScreenProps = AppStackScreenProps<"Wifi">

// Mock data types
interface WifiNetwork {
  ssid: string
  bssid: string
  signal: number // 0-100
  security: "Open" | "WPA2" | "WPA3" | "WEP"
  connected?: boolean
}

interface CurrentConnection {
  ssid: string
  ip: string
  signal: number
  speed: string
}

// Mock data
const MOCK_CURRENT: CurrentConnection = {
  ssid: "HomeNetwork",
  ip: "192.168.1.100",
  signal: 78,
  speed: "72 Mbps",
}

const MOCK_NETWORKS: WifiNetwork[] = [
  { ssid: "HomeNetwork", bssid: "AA:BB:CC:DD:EE:FF", signal: 78, security: "WPA2", connected: true },
  { ssid: "Neighbor_5G", bssid: "11:22:33:44:55:66", signal: 65, security: "WPA3" },
  { ssid: "CoffeeShop", bssid: "77:88:99:AA:BB:CC", signal: 52, security: "Open" },
  { ssid: "Neighbor_2G", bssid: "DD:EE:FF:00:11:22", signal: 35, security: "WPA2" },
]

export const WifiScreen: FC<WifiScreenProps> = function WifiScreen({ navigation }) {
  const { themed, theme } = useAppTheme()
  const [networks, setNetworks] = useState<WifiNetwork[]>(MOCK_NETWORKS)
  const [currentConnection, setCurrentConnection] = useState<CurrentConnection | null>(MOCK_CURRENT)
  const [isScanning, setIsScanning] = useState(false)
  const [showConnectSheet, setShowConnectSheet] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null)
  const [password, setPassword] = useState("")
  const [connectError, setConnectError] = useState<string | null>(null)

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
    }, 2000)
  }

  const handleNetworkPress = (network: WifiNetwork) => {
    if (network.connected) return
    setSelectedNetwork(network)
    setShowConnectSheet(true)
    setConnectError(null)
    setPassword("")
  }

  const handleConnect = () => {
    if (!selectedNetwork) return
    
    setConnectError(null)
    setTimeout(() => {
      if (selectedNetwork.security !== "Open" && !password) {
        setConnectError("Password required")
        return
      }
      setShowConnectSheet(false)
      setCurrentConnection({
        ssid: selectedNetwork.ssid,
        ip: "192.168.1.101",
        signal: selectedNetwork.signal,
        speed: "72 Mbps",
      })
    }, 1000)
  }

  const handleDisconnect = () => {
    setCurrentConnection(null)
  }

  const renderSignalBars = (signal: number) => {
    const bars = Math.ceil(signal / 25)
    return (
      <View style={$signalContainer}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              $signalBar,
              { height: 4 + bar * 3 },
              bar <= bars ? themed($signalBarActive) : themed($signalBarInactive),
            ]}
          />
        ))}
      </View>
    )
  }

  const renderNetworkItem = ({ item }: { item: WifiNetwork }) => (
    <Pressable
      style={[themed($networkItem), item.connected && themed($networkItemConnected)]}
      onPress={() => handleNetworkPress(item)}
    >
      <View style={$networkLeft}>
        {renderSignalBars(item.signal)}
      </View>
      <View style={$networkCenter}>
        <Text text={item.ssid} size="md" weight="medium" />
        <Text text={`${item.signal}% • ${item.security}`} size="xs" color="textDim" />
      </View>
      <View style={$networkRight}>
        {item.security !== "Open" && (
          <Text text="🔒" size="sm" />
        )}
        {item.connected && (
          <View style={themed($connectedBadge)}>
            <Text text="Connected" size="xs" color="success" />
          </View>
        )}
      </View>
    </Pressable>
  )

  return (
    <Screen preset="scroll">
      <Header title="Wi-Fi" titleMode="center" leftIcon="back" onLeftPress={() => navigation.goBack()} />

      {/* Current Connection */}
      {currentConnection && (
        <Card style={themed($card)}>
          <Text text={currentConnection.ssid} size="lg" weight="semiBold" style={themed($cardTitle)} />
          
          <View style={$connectionRow}>
            <Text text="IP Address" size="sm" color="textDim" style={$connectionKey} />
            <Text text={currentConnection.ip} size="sm" />
          </View>
          
          <View style={$connectionRow}>
            <Text text="Signal" size="sm" color="textDim" style={$connectionKey} />
            <View style={$signalProgress}>
              <ProgressBar value={currentConnection.signal} style={$progressBar} />
              <Text text={`${currentConnection.signal}%`} size="xs" color="textDim" />
            </View>
          </View>
          
          <View style={$connectionRow}>
            <Text text="Speed" size="sm" color="textDim" style={$connectionKey} />
            <Text text={currentConnection.speed} size="sm" />
          </View>
          
          <Button
            text="Disconnect"
            preset="default"
            onPress={handleDisconnect}
            style={$disconnectButton}
          />
        </Card>
      )}

      {/* Available Networks */}
      <SectionHeader
        title="Available Networks"
        rightAction={{
          label: isScanning ? "Scanning..." : "Scan",
          onPress: handleScan,
        }}
      />

      {isScanning && (
        <View style={$scanningContainer}>
          <ActivityIndicator size="small" color={theme.colors.tint} />
          <Text text="Scanning for networks..." size="sm" color="textDim" style={$scanningText} />
        </View>
      )}

      <FlatList
        data={networks}
        keyExtractor={(item) => item.bssid}
        renderItem={renderNetworkItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={themed($emptyContainer)}>
            <Text text="No networks found. Try scanning again." size="sm" color="textDim"  />
          </View>
        }
      />

      {/* Connect Modal */}
      <Modal
        visible={showConnectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConnectSheet(false)}
      >
        <View style={$modalOverlay}>
          <Pressable style={$modalBackdrop} onPress={() => setShowConnectSheet(false)} />
          <View style={themed($sheetContent)}>
            {selectedNetwork && (
              <>
                <Text text={`Connect to "${selectedNetwork.ssid}"`} size="lg" weight="semiBold"  />
                
                {selectedNetwork.security !== "Open" && (
                  <TextField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter password"
                    style={$passwordInput}
                  />
                )}
                
                {connectError && (
                  <Text text={connectError} size="sm" color="error" style={$errorText} />
                )}
                
                <View style={$sheetActions}>
                  <Button
                    text="Cancel"
                    preset="default"
                    onPress={() => setShowConnectSheet(false)}
                    style={$sheetButton}
                  />
                  <Button
                    text="Connect"
                    preset="filled"
                    onPress={handleConnect}
                    style={$sheetButton}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginHorizontal: spacing.md, marginBottom: spacing.md })
const $cardTitle: ThemedStyle<ViewStyle> = ({ colors }) => ({ color: colors.text, marginBottom: 12 })
const $connectionRow: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }
const $connectionKey: ViewStyle = { width: 80 }
const $signalProgress: ViewStyle = { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }
const $progressBar: ViewStyle = { flex: 1 }
const $disconnectButton: ViewStyle = { marginTop: 12, alignSelf: "flex-end" }

const $networkItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border })
const $networkItemConnected: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.palette.neutral100 })
const $networkLeft: ViewStyle = { width: 40 }
const $networkCenter: ViewStyle = { flex: 1 }
const $networkRight: ViewStyle = { alignItems: "flex-end", gap: 4 }
const $signalContainer: ViewStyle = { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 20 }
const $signalBar: ViewStyle = { width: 4, borderRadius: 1 }
const $signalBarActive: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.success })
const $signalBarInactive: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.border })
const $connectedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 })

const $scanningContainer: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 8 }
const $scanningText: ViewStyle = { marginLeft: 8 }

const $emptyContainer: ViewStyle = { padding: 20 }
const $emptyText: TextStyle = { color: "#64748B", textAlign: "center" }

const $modalOverlay: ViewStyle = { flex: 1, justifyContent: "flex-end" }
const $modalBackdrop: ViewStyle = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }
const $sheetContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg })
const $sheetTitle: ThemedStyle<ViewStyle> = ({ colors }) => ({ color: colors.text, marginBottom: 16 })
const $passwordInput: ViewStyle = { marginBottom: 12 }
const $errorText: ViewStyle = { marginBottom: 12 }
const $sheetActions: ViewStyle = { flexDirection: "row", gap: 12 }
const $sheetButton: ViewStyle = { flex: 1 }
