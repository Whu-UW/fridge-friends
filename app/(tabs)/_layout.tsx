import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    FridgeIcon,
    FriendsIcon,
    MealsIcon,
    YouIcon,
} from "../../components/ui/AppIcons";
import { Colors, Fonts } from "../../constants/Theme";
import { useApp } from "../../context/AppContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { unreadNotificationCount } = useApp();

  // Android edge-to-edge system navigation bar safe area handling
  const bottomPadding =
    insets.bottom > 0 ? insets.bottom : Platform.OS === "android" ? 12 : 8;
  const tabHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Handover screens provide their own custom header layouts
        tabBarActiveTintColor: Colors.terracotta,
        tabBarInactiveTintColor: "#8A776A",
        tabBarLabelStyle: {
          fontFamily: Fonts.headingSemiBold,
          fontSize: 12,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.ink,
          borderTopWidth: 2.5,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
      }}
    >
      {/* Tab 1: Fridge */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Fridge",
          tabBarLabel: "Fridge",
          tabBarIcon: ({ color }) => <FridgeIcon size={22} color={color} />,
        }}
      />

      {/* Tab 2: Meals */}
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarLabel: "Meals",
          tabBarIcon: ({ color }) => <MealsIcon size={22} color={color} />,
          tabBarBadge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E6795A', fontSize: 11 },
        }}
      />

      {/* Tab 3: Friends */}
      <Tabs.Screen
        name="social"
        options={{
          title: "Friends",
          tabBarLabel: "Friends",
          tabBarIcon: ({ color }) => <FriendsIcon size={22} color={color} />,
        }}
      />

      {/* Tab 4: You (Profile & Waste Analytics) */}
      <Tabs.Screen
        name="insights"
        options={{
          title: "You",
          tabBarLabel: "You",
          tabBarIcon: ({ color }) => <YouIcon size={22} color={color} />,
        }}
      />

      {/* Hidden flow tab (accessed via Feast Mode button on Shelf) */}
      <Tabs.Screen
        name="feasts"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
