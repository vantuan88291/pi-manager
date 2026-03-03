import { FC, useState } from "react"
import { View, ViewStyle, Pressable } from "react-native"

import { Header } from "@/components/Header"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"

type SettingsScreenProps = AppStackScreenProps<"Settings">

const THEME_OPTIONS: { label: string; value: "light" | "dark" | undefined }[] = [
  { label: "System", value: undefined },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Tiếng Việt", value: "vi" },
]

export const SettingsScreen: FC<SettingsScreenProps> = function SettingsScreen() {
  const { themed, theme, themeContext, setThemeContextOverride } = useAppTheme()
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | undefined>(themeContext)
  const [selectedLanguage, setSelectedLanguage] = useState("en")

  const handleThemeChange = (newTheme: "light" | "dark" | undefined) => {
    setSelectedTheme(newTheme)
    setThemeContextOverride(newTheme)
  }

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang)
  }

  return (
    <Screen preset="scroll">
      <Header title="Settings" titleMode="center" />

      <View style={themed($content)}>
        <Card heading="Appearance" style={themed($card)} ContentComponent={
          <View>
            <View style={themed($settingRow)}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="moon" color={theme.colors.textDim} size={20} />
                <Text text="Theme" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Pressable style={themed($picker)} onPress={() => {
                const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === selectedTheme)
                const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length
                handleThemeChange(THEME_OPTIONS[nextIndex].value)
              }}>
                <Text text={THEME_OPTIONS.find((o) => o.value === selectedTheme)?.label ?? "System"} color="textDim" size="sm" />
                <Icon font="Ionicons" icon="chevron-forward" color={theme.colors.textDim} size={20} />
              </Pressable>
            </View>
            <View style={themed([$settingRow, $borderTop])}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="globe" color={theme.colors.textDim} size={20} />
                <Text text="Language" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Pressable style={themed($picker)} onPress={() => {
                const currentIndex = LANGUAGE_OPTIONS.findIndex((o) => o.value === selectedLanguage)
                const nextIndex = (currentIndex + 1) % LANGUAGE_OPTIONS.length
                handleLanguageChange(LANGUAGE_OPTIONS[nextIndex].value)
              }}>
                <Text text={LANGUAGE_OPTIONS.find((o) => o.value === selectedLanguage)?.label ?? "English"} color="textDim" size="sm" />
                <Icon font="Ionicons" icon="chevron-forward" color={theme.colors.textDim} size={20} />
              </Pressable>
            </View>
          </View>
        } />

        <Card heading="Connection" style={themed([$card, $section])} ContentComponent={
          <View>
            <View style={themed($settingRow)}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="link" color={theme.colors.textDim} size={20} />
                <Text text="Server URL" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Text text="https://pi.example.com" color="textDim" size="sm" />
            </View>
            <View style={themed([$settingRow, $borderTop])}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="radio" color={theme.colors.textDim} size={20} />
                <Text text="Status" weight="medium" color="text" style={$settingLabel} />
              </View>
              <View style={$statusBadge}>
                <View style={[$statusDot, { backgroundColor: theme.colors.success }]} />
                <Text text="Connected" color="success" size="sm" weight="medium" />
              </View>
            </View>
            <View style={themed([$settingRow, $borderTop])}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="pulse" color={theme.colors.textDim} size={20} />
                <Text text="Latency" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Text text="42 ms" color="textDim" size="sm" />
            </View>
          </View>
        } />

        <Card heading="About" style={themed([$card, $section])} ContentComponent={
          <View>
            <View style={themed($settingRow)}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="information-circle" color={theme.colors.textDim} size={20} />
                <Text text="App Version" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Text text="1.0.0" color="textDim" size="sm" />
            </View>
            <View style={themed([$settingRow, $borderTop])}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="server" color={theme.colors.textDim} size={20} />
                <Text text="Server Version" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Text text="1.0.0" color="textDim" size="sm" />
            </View>
            <View style={themed([$settingRow, $borderTop])}>
              <View style={$settingLeft}>
                <Icon font="Ionicons" icon="person" color={theme.colors.textDim} size={20} />
                <Text text="Telegram ID" weight="medium" color="text" style={$settingLabel} />
              </View>
              <Text text="600843385" color="textDim" size="sm" />
            </View>
          </View>
        } />
      </View>
    </Screen>
  )
}

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({ padding: spacing.md })
const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({ paddingHorizontal: spacing.md, paddingVertical: spacing.sm })
const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({ marginTop: spacing.lg })
const $settingRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md })
const $borderTop: ThemedStyle<ViewStyle> = ({ colors }) => ({ borderTopWidth: 1, borderTopColor: colors.border })
const $settingLeft: ViewStyle = { flexDirection: "row", alignItems: "center", flex: 1 }
const $settingLabel: ViewStyle = { marginLeft: 12 }
const $picker: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 }
const $statusBadge: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 6 }
const $statusDot: ViewStyle = { width: 8, height: 8, borderRadius: 4 }
