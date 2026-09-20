import { Tabs } from 'expo-router';
import { Text, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/Theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Android edge-to-edge system navigation bar safe area handling
  const bottomPadding = insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 12 : 8;
  const tabHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Handover screens provide their own custom header layouts
        tabBarActiveTintColor: Colors.terracotta,
        tabBarInactiveTintColor: '#8A776A',
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
      {/* Tab 1: Shelf */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shelf',
          tabBarLabel: 'Shelf',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? '🏠' : '🛖'}</Text>
          ),
        }}
      />

      {/* Tab 2: Feast */}
      <Tabs.Screen
        name="feasts"
        options={{
          title: 'Feast',
          tabBarLabel: 'Feast',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? '🎉' : '👥'}</Text>
          ),
        }}
      />

      {/* Tab 3: You (Profile, Friends & Waste Analytics) */}
      <Tabs.Screen
        name="insights"
        options={{
          title: 'You',
          tabBarLabel: 'You',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>{focused ? '🧑‍🍳' : '👤'}</Text>
          ),
        }}
      />

      {/* Hidden legacy tab (accessible only if navigated to directly) */}
      <Tabs.Screen
        name="social"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
