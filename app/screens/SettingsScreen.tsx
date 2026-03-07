import { FC, useState, useEffect } from "react"
import { View, ViewStyle, Pressable, ScrollView } from "react-native"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { ActionModal } from "@/components/ActionModal"
import { Button } from "@/components/Button"
import { useAppTheme } from "@/theme/context"
import { LANGUAGE_OPTIONS, changeLanguage, LanguageCode, getSavedLanguage } from "@/i18n"
import type { ThemedStyle } from "@/theme/types"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useConnectionState } from "@/services/socket/SocketContext"

type SettingsScreenProps = AppStackScreenProps<"Settings">

const THEME_OPTIONS: { labelTx: string; value: "light" | "dark" | undefined }[] = [
  { labelTx: "settings:theme.system", value: undefined },
  { labelTx: "settings:theme.light", value: "light" },
  { labelTx: "settings:theme.dark", value: "dark" },
]

export const SettingsScreen: FC<SettingsScreenProps> = function SettingsScreen() {
  const { themed, theme, themeContext, setThemeContextOverride } = useAppTheme()
  const connectionState = useConnectionState()
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | undefined>(themeContext)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("vi")
  const [isLangModalVisible, setIsLangModalVisible] = useState(false)

  // Load saved language on mount
  useEffect(() => {
    const loadLang = async () => {
      const saved = getSavedLanguage()
      if (saved) setSelectedLanguage(saved)
    }
    loadLang()
  }, [])

  const handleThemeChange = (newTheme: "light" | "dark" | undefined) => {
    setSelectedTheme(newTheme)
    setThemeContextOverride(newTheme)
  }

  const handleLanguageSelect = async (lang: LanguageCode) => {
    setSelectedLanguage(lang)
    await changeLanguage(lang)
    setIsLangModalVisible(false)
  }

  const getCurrentThemeLabel = () => {
    const option = THEME_OPTIONS.find((o) => o.value === selectedTheme)
    return option?.labelTx ?? "settings:theme.system"
  }

  const getCurrentLanguageLabel = () => {
    return LANGUAGE_OPTIONS.find((o) => o.value === selectedLanguage)?.label ?? "English"
  }

  const getConnectionStatus = () => {
    if (connectionState.status === "connected" && connectionState.isAuthenticated) {
      return { text: "common:connected", color: "success" as const }
    } else if (connectionState.status === "connecting") {
      return { text: "common:connecting", color: "warning" as const }
    } else {
      return { text: "common:disconnected", color: "error" as const }
    }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <Screen preset="scroll">
      <Header titleTx="settings:title" titleMode="center" />

      <View style={themed($content)}>
        <Card
          headingTx="settings:appearance"
          style={themed($card)}
          ContentComponent={
            <View>
              <View style={themed([$settingRow, $borderBottom])}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="moon" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:theme.label" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Pressable style={themed($picker)} onPress={() => {
                  const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === selectedTheme)
                  const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length
                  handleThemeChange(THEME_OPTIONS[nextIndex].value)
                }}>
                  <Text tx={getCurrentThemeLabel()} color="textDim" size="sm" />
                  <Icon font="Ionicons" icon="chevron-forward" color={theme.colors.textDim} size={20} />
                </Pressable>
              </View>
              <View style={themed($settingRow)}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="globe" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:language.label" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Pressable style={themed($picker)} onPress={() => setIsLangModalVisible(true)}>
                  <Text text={getCurrentLanguageLabel()} color="textDim" size="sm" />
                  <Icon font="Ionicons" icon="chevron-forward" color={theme.colors.textDim} size={20} />
                </Pressable>
              </View>
            </View>
          }
        />

        <Card
          headingTx="settings:connection"
          style={themed([$card, $section])}
          ContentComponent={
            <View>
              <View style={themed([$settingRow, $borderBottom])}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="link" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:serverUrl" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Text text="http://192.168.50.134:3001" color="textDim" size="sm" />
              </View>
              <View style={themed([$settingRow, $borderBottom])}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="radio" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:status" weight="medium" color="text" style={$settingLabel} />
                </View>
                <View style={$statusBadge}>
                  <View style={[$statusDot, { backgroundColor: theme.colors[connectionStatus.color] }]} />
                  <Text tx={connectionStatus.text} color={connectionStatus.color} size="sm" weight="medium" />
                </View>
              </View>
            </View>
          }
        />

        <Card
          headingTx="settings:about"
          style={themed([$card, $section])}
          ContentComponent={
            <View>
              <View style={themed([$settingRow, $borderBottom])}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="information-circle" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:appVersion" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Text text="1.0.0" color="textDim" size="sm" />
              </View>
              <View style={themed([$settingRow, $borderBottom])}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="server" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:serverVersion" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Text text="1.0.0" color="textDim" size="sm" />
              </View>
              <View style={themed($settingRow)}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="person" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:telegramId" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Text
                  text={connectionState.user
                    ? `${connectionState.user.firstName} (${connectionState.user.id})`
                    : "Not connected"}
                  color={connectionState.user ? "text" : "textDim"}
                  size="sm"
                />
              </View>
              <View style={themed($settingRow)}>
                <View style={$settingLeft}>
                  <Icon font="Ionicons" icon="id-card" color={theme.colors.textDim} size={20} />
                  <Text tx="settings:userId" weight="medium" color="text" style={$settingLabel} />
                </View>
                <Text
                  text={connectionState.user?.id?.toString() || "N/A"}
                  color="text"
                  size="sm"
                  selectable
                />
              </View>
            </View>
          }
        />


      </View>

      {/* Language Selection Modal */}
      <ActionModal
        visible={isLangModalVisible}
        onClose={() => setIsLangModalVisible(false)}
        title="Select Language"
      >
        <ScrollView style={$langList} showsVerticalScrollIndicator={false}>
          {LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                $langOption,
                selectedLanguage === option.value && { backgroundColor: theme.colors.tint + "20" },
              ]}
              onPress={() => handleLanguageSelect(option.value)}
            >
              <Text
                text={option.label}
                weight={selectedLanguage === option.value ? "semiBold" : "normal"}
                color={selectedLanguage === option.value ? "tint" : "text"}
              />
              {selectedLanguage === option.value && (
                <Icon font="Ionicons" icon="checkmark" color={theme.colors.tint} size={20} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </ActionModal>
    </Screen>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({ paddingHorizontal: spacing.md, paddingVertical: spacing.sm })
const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.lg })
const $settingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md })
const $borderBottom: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderBottomWidth: 1, borderBottomColor: colors.border })
const $settingLeft: ViewStyle = { flexDirection: "row", alignItems: "center", flex: 1 }
const $settingLabel: ViewStyle = { marginLeft: 12 }
const $picker: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 }
const $statusBadge: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 6 }
const $statusDot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
const $langList: ViewStyle = { maxHeight: 300 }
const $langOption: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 }
