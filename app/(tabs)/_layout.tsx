import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#111827' },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Fridge',
          tabBarLabel: 'My Fridge',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧊</Text>,
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: 'Circle Feed',
          tabBarLabel: 'Circle',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="impact"
        options={{
          title: 'Impact Stats',
          tabBarLabel: 'Impact',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
    </Tabs>
  );
}
