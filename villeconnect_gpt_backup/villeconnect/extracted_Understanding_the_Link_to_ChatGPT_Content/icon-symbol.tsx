// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation icons
  "house.fill": "home",
  "storefront.fill": "storefront",
  "message.fill": "chat",
  "building.columns.fill": "account-balance",
  "person.fill": "person",
  // Action icons
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "magnifyingglass": "search",
  "bell.fill": "notifications",
  "car.fill": "directions-car",
  "wrench.fill": "build",
  "calendar": "event",
  "phone.fill": "phone",
  "location.fill": "place",
  "star.fill": "star",
  "clock.fill": "schedule",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "trash.fill": "delete",
  "arrow.right": "arrow-forward",
  "plus": "add",
  "xmark": "close",
  "checkmark": "check",
  "gear": "settings",
  "heart.fill": "favorite",
  "bookmark.fill": "bookmark",
  "doc.text.fill": "description",
  "megaphone.fill": "campaign",
  "tag.fill": "local-offer",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
