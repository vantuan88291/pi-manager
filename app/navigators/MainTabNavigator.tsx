import { FC } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

import { Icon } from "@/components/Icon"
import { useAppTheme } from "@/theme/context"
import { TxKeyPath } from "@/i18n"

import { ControlMenuScreen } from "@/screens/ControlMenuScreen"
import { DashboardScreen } from "@/screens/DashboardScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

interface TabConfig {
  name: keyof MainTabParamList
  component: React.ComponentType<any>
  icon: string
  labelTx: TxKeyPath
}

const TABS: TabConfig[] = [
  { name: "Dashboard", component: DashboardScreen, icon: "speedometer", labelTx: "tabs:dashboard" },
  { name: "Control", component: ControlMenuScreen, icon: "game-controller", labelTx: "tabs:control" },
  { name: "Settings", component: SettingsScreen, icon: "settings", labelTx: "tabs:settings" },
]

export const MainTabNavigator: FC = function MainTabNavigator() {
  const { theme } = useAppTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarLabelStyle: {
          textAlign: "center",
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon font="Ionicons" icon={tab.icon} color={color} size={size} />
            ),
            tabBarLabel: tab.labelTx,
          }}
        />
      ))}
    </Tab.Navigator>
  )
}
