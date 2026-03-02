import { FC } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

import { Icon } from "@/components/Icon"
import { useAppTheme } from "@/theme/context"

import { ControlMenuScreen } from "@/screens/ControlMenuScreen"
import { DashboardScreen } from "@/screens/DashboardScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textDim,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon font="Ionicons" icon="speedometer" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Control"
        component={ControlMenuScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon font="Ionicons" icon="game-controller" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon font="Ionicons" icon="settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
