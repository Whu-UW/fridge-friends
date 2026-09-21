import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? "🏠" : "🛖"}</Text>
          ),
        }}
      />

      {/* Tab 2: Meals */}
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarLabel: "Meals",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? "🍳" : "🍽️"}</Text>
          ),
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
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? "👥" : "👤"}</Text>
          ),
        }}
      />

      {/* Tab 4: You (Profile & Waste Analytics) */}
      <Tabs.Screen
        name="insights"
        options={{
          title: "You",
          tabBarLabel: "You",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? "🧑‍🍳" : "📊"}</Text>
          ),
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
