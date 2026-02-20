import { ComponentType } from "react"
import {
  Image,
  ImageStyle,
  StyleProp,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  ViewStyle,
} from "react-native"
import AntDesign from "@expo/vector-icons/AntDesign"
import Entypo from "@expo/vector-icons/Entypo"
import EvilIcons from "@expo/vector-icons/EvilIcons"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome from "@expo/vector-icons/FontAwesome"
import FontAwesome5 from "@expo/vector-icons/FontAwesome5"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import Fontisto from "@expo/vector-icons/Fontisto"
import Foundation from "@expo/vector-icons/Foundation"
import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import Octicons from "@expo/vector-icons/Octicons"
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons"
import Zocial from "@expo/vector-icons/Zocial"

import { useAppTheme } from "@/theme/context"

export const fontRegistry = {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Fontisto,
  Foundation,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
} as const

export type FontFamily = keyof typeof fontRegistry

export type IconTypes = keyof typeof iconRegistry

type FontIconProps = {
  /**
   * The icon font family from @expo/vector-icons (e.g. "Ionicons", "MaterialIcons")
   */
  font: FontFamily
  /**
   * The name of the icon in the selected font family
   */
  icon: string
}

type ImageIconProps = {
  font?: undefined
  /**
   * The name of the registered PNG icon
   */
  icon: IconTypes
}

type BaseIconProps = (FontIconProps | ImageIconProps) & {
  /**
   * An optional tint color for the icon
   */
  color?: string

  /**
   * An optional size for the icon. For PNG icons defaults to the image resolution,
   * for font icons defaults to 24.
   */
  size?: number

  /**
   * Style overrides for the icon (ImageStyle for PNG, TextStyle for font icons)
   */
  style?: StyleProp<ImageStyle | TextStyle>

  /**
   * Style overrides for the icon container
   */
  containerStyle?: StyleProp<ViewStyle>
}

type PressableIconProps = Omit<TouchableOpacityProps, "style"> & BaseIconProps
type IconProps = Omit<ViewProps, "style"> & BaseIconProps

type VectorIconProps = {
  name: string
  size?: number
  color?: string
  style?: StyleProp<TextStyle>
}

function IconContent({
  icon,
  font,
  color,
  size,
  style,
}: {
  icon: string
  font?: FontFamily
  color: string
  size?: number
  style?: StyleProp<ImageStyle | TextStyle>
}) {
  if (font) {
    const FontComponent = fontRegistry[font] as unknown as ComponentType<VectorIconProps>
    return <FontComponent name={icon} size={size ?? 24} color={color} style={style as TextStyle} />
  }

  const $imageStyle: StyleProp<ImageStyle> = [
    $imageStyleBase,
    { tintColor: color },
    size !== undefined && { width: size, height: size },
    style as StyleProp<ImageStyle>,
  ]

  return <Image style={$imageStyle} source={iconRegistry[icon as IconTypes]} />
}

/**
 * A component to render a registered icon.
 * It is wrapped in a <TouchableOpacity />
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Icon/}
 * @param {PressableIconProps} props - The props for the `PressableIcon` component.
 * @returns {JSX.Element} The rendered `PressableIcon` component.
 */
export function PressableIcon(props: PressableIconProps) {
  const {
    icon,
    font,
    color,
    size,
    style: $styleOverride,
    containerStyle: $containerStyleOverride,
    ...pressableProps
  } = props

  const { theme } = useAppTheme()

  return (
    <TouchableOpacity {...pressableProps} style={$containerStyleOverride}>
      <IconContent
        icon={icon}
        font={font}
        color={color ?? theme.colors.text}
        size={size}
        style={$styleOverride}
      />
    </TouchableOpacity>
  )
}

/**
 * A component to render a registered icon.
 * It is wrapped in a <View />, use `PressableIcon` if you want to react to input
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Icon/}
 * @param {IconProps} props - The props for the `Icon` component.
 * @returns {JSX.Element} The rendered `Icon` component.
 */
export function Icon(props: IconProps) {
  const {
    icon,
    font,
    color,
    size,
    style: $styleOverride,
    containerStyle: $containerStyleOverride,
    ...viewProps
  } = props

  const { theme } = useAppTheme()

  return (
    <View {...viewProps} style={$containerStyleOverride}>
      <IconContent
        icon={icon}
        font={font}
        color={color ?? theme.colors.text}
        size={size}
        style={$styleOverride}
      />
    </View>
  )
}

export const iconRegistry = {
  back: require("@assets/icons/back.png"),
  bell: require("@assets/icons/bell.png"),
  caretLeft: require("@assets/icons/caretLeft.png"),
  caretRight: require("@assets/icons/caretRight.png"),
  check: require("@assets/icons/check.png"),
  hidden: require("@assets/icons/hidden.png"),
  ladybug: require("@assets/icons/ladybug.png"),
  lock: require("@assets/icons/lock.png"),
  menu: require("@assets/icons/menu.png"),
  more: require("@assets/icons/more.png"),
  settings: require("@assets/icons/settings.png"),
  view: require("@assets/icons/view.png"),
  x: require("@assets/icons/x.png"),
}

const $imageStyleBase: ImageStyle = {
  resizeMode: "contain",
}
