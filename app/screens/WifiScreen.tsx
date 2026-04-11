import { FC, useState, useEffect } from "react"
import { View, ViewStyle, FlatList, ActivityIndicator } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { SectionHeader } from "@/components/SectionHeader"
import { ActionModal } from "@/components/ActionModal"
import { useAppTheme } from "@/theme/context"
import { getFeatureColor } from "@/theme/featureColors"
import { useSocket } from "@/services/socket/SocketContext"
import { wifiClientModule } from "@/services/socket/modules/wifi"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import type { WiFiNetwork, WiFiStatus } from "../../../shared/types/wifi"

type WifiScreenProps = AppStackScreenProps<"Wifi">

interface CurrentConnection {
  ssid: string
  ip: string
  signal: number
}

export const WifiScreen: FC<WifiScreenProps> = function WifiScreen({ navigation }) {
  const { t } = useTranslation()
  const { themed, theme } = useAppTheme()
  const { accent: wifiAccent } = getFeatureColor("wifi", theme.isDark)
  const { subscribeToModule, unsubscribeFromModule } = useSocket()

  const [wifiStatus, setWifiStatus] = useState<WiFiStatus | null>(null)
  const [currentConnection, setCurrentConnection] = useState<CurrentConnection | null>(null)
  const [networks, setNetworks] = useState<WiFiNetwork[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showConnectSheet, setShowConnectSheet] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null)
  const [password, setPassword] = useState("")
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)

  // Subscribe to WiFi module
  useEffect(() => {
    subscribeToModule("wifi")

    const unsubStatus = wifiClientModule.onStatus((status) => {
      setWifiStatus(status)

      // Only update networks if we have new data or haven't scanned yet
      if (status.networks && status.networks.length > 0) {
        setNetworks(status.networks)
        setHasScanned(true)
      }

      if (status.connected && status.ssid) {
        setCurrentConnection({
          ssid: status.ssid,
          ip: status.ip || "N/A",
          signal: status.signal || 0,
        })
      } else if (!status.connected) {
        setCurrentConnection(null)
      }
    })

    return () => {
      unsubStatus()
      unsubscribeFromModule("wifi")
    }
  }, [subscribeToModule, unsubscribeFromModule])

  const handleScan = () => {
    setIsScanning(true)
    setNetworks([]) // Clear while scanning

    wifiClientModule.scan()

    const unsubScan = wifiClientModule.onScan((scanNetworks, error) => {
      setIsScanning(false)
      if (!error && scanNetworks.length > 0) {
        setNetworks(scanNetworks)
        setHasScanned(true)
      } else if (error) {
        console.log("Scan error:", error)
      }
      unsubScan()
    })

    setTimeout(() => {
      setIsScanning(false)
      unsubScan()
    }, 10000)
  }

  const handleNetworkPress = (network: WiFiNetwork) => {
    if (network.ssid === wifiStatus?.ssid) return
    setSelectedNetwork(network)
    setShowConnectSheet(true)
    setConnectError(null)
    setPassword("")
  }

  const handleConnect = async () => {
    if (!selectedNetwork) return
    setConnectError(null)
    setIsConnecting(true)

    const result = await wifiClientModule.connect(
      selectedNetwork.ssid,
      selectedNetwork.security === "Open" ? undefined : password,
    )

    setIsConnecting(false)

    if (result.success) {
      setShowConnectSheet(false)
      setPassword("")
    } else {
      setConnectError(result.error || t("wifi:errors.connectionFailed"))
    }
  }

  const getSecurityIcon = (security: string[]) => {
    const sec = security[0] || "Open"
    return sec === "Open" ? "🔓" : "🔒"
  }

  const getSecurityLabel = (security: string[]) => {
    return security[0] || t("wifi:security.open")
  }

  const renderNetworkItem = ({ item }: { item: WiFiNetwork }) => {
    const isConnected = item.ssid === wifiStatus?.ssid
    const signalBars = item.signal >= 80 ? 4 : item.signal >= 60 ? 3 : item.signal >= 40 ? 2 : 1

    return (
      <View style={themed($networkItem)}>
        <View style={$signalBars}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              style={[
                $signalBar,
                {
                  backgroundColor: bar <= signalBars ? wifiAccent : theme.colors.border,
                  height: 4 + bar * 3,
                },
              ]}
            />
          ))}
        </View>

        <View style={$networkInfo}>
          <Text text={item.ssid} weight="medium" color="text" />
          <Text
            text={`${item.signal}% • ${getSecurityLabel(item.security)}`}
            size="xs"
            color="textDim"
          />
        </View>

        <View style={$networkRight}>
          <Text text={getSecurityIcon(item.security)} size="sm" />
          {isConnected && (
            <View style={themed($connectedBadge)}>
              <Text tx="wifi:connected" size="xs" color="success" weight="medium" />
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <Screen
      preset="scroll"
      header={
        <Header
          titleTx="wifi:title"
          titleMode="center"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
      }
    >

      {/* Current Connection */}
      {currentConnection && (
        <View style={themed($card)}>
          <View style={$connectionHeader}>
            <Text tx="wifi:currentConnection" size="sm" color="textDim" weight="medium" />
            <View style={themed($connectedBadge)}>
              <Text tx="wifi:connected" size="xs" color="success" weight="medium" />
            </View>
          </View>

          <Text
            text={currentConnection.ssid}
            size="xl"
            weight="semiBold"
            color="text"
            style={{ marginTop: 8 }}
          />

          <View style={$connectionDetails}>
            <View style={$detailRow}>
              <Text text="📶" size="sm" />
              <Text tx="wifi:signal" size="sm" color="textDim" style={{ marginLeft: 6 }} />
              <Text
                text={`${currentConnection.signal}%`}
                size="sm"
                color="text"
                weight="medium"
                style={{ marginLeft: 4 }}
              />
            </View>

            <View style={$detailRow}>
              <Text text="🌐" size="sm" />
              <Text tx="wifi:ipAddress" size="sm" color="textDim" style={{ marginLeft: 6 }} />
              <Text
                text={currentConnection.ip}
                size="sm"
                color="text"
                weight="medium"
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>
        </View>
      )}

      {/* Available Networks */}
      <SectionHeader
        titleTx="wifi:availableNetworks"
        rightActionTx="wifi:scan"
        onRightAction={handleScan}
        style={themed($sectionHeader)}
      />

      {isScanning && (
        <View style={$scanning}>
          <ActivityIndicator size="small" color={wifiAccent} />
          <Text tx="wifi:scanning" size="sm" color="textDim" style={{ marginLeft: 8 }} />
        </View>
      )}

      <View style={themed($card)}>
        {!hasScanned && !isScanning ? (
          <View style={$emptyState}>
            <Text text="📡" size="xl" />
            <Text tx="wifi:tapToScan" size="sm" color="textDim" style={{ marginTop: 8 }} />
            <Button
              tx="wifi:scan"
              preset="default"
              onPress={handleScan}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : networks.length === 0 && !isScanning ? (
          <View style={$emptyState}>
            <Text text="📡" size="xl" />
            <Text tx="wifi:noNetworks" size="sm" color="textDim" style={{ marginTop: 8 }} />
            <Button
              tx="wifi:scan"
              preset="default"
              onPress={handleScan}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <FlatList
            data={networks}
            keyExtractor={(item) => item.bssid || item.ssid}
            renderItem={renderNetworkItem}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Connect Modal */}
      <ActionModal
        visible={showConnectSheet}
        onClose={() => {
          setShowConnectSheet(false)
          setConnectError(null)
          setPassword("")
        }}
        title={selectedNetwork?.ssid || ""}
      >
        <View style={{ gap: 16 }}>
          {selectedNetwork?.security !== "Open" && (
            <>
              <TextField
                labelTx="wifi:password"
                value={password}
                onChangeText={setPassword}
                placeholderTx="wifi:passwordPlaceholder"
                secureTextEntry
                autoFocus
              />
              {connectError && <Text text={connectError} size="sm" color="error" />}
            </>
          )}

          <Button
            tx={isConnecting ? "wifi:connecting" : "wifi:connect"}
            preset="filled"
            onPress={handleConnect}
            disabled={isConnecting || (selectedNetwork?.security !== "Open" && !password)}
          />
        </View>
      </ActionModal>
    </Screen>
  )
}

const $card: ViewStyle = { backgroundColor: "transparent", paddingHorizontal: 16, marginBottom: 16 }
const $connectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}
const $connectionDetails: ViewStyle = { marginTop: 12, gap: 8 }
const $detailRow: ViewStyle = { flexDirection: "row", alignItems: "center" }
const $sectionHeader: ViewStyle = { paddingHorizontal: 16, marginTop: 8 }
const $scanning: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 8,
}
const $emptyState: ViewStyle = { alignItems: "center", paddingVertical: 32 }
const $networkItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.05)",
}
const $signalBars: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 2,
  marginRight: 12,
  width: 16,
}
const $signalBar: ViewStyle = { width: 3, borderRadius: 1 }
const $networkInfo: ViewStyle = { flex: 1 }
const $networkRight: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }
const $connectedBadge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  backgroundColor: "rgba(16, 185, 129, 0.1)",
}
