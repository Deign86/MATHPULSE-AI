import { Tabs } from 'expo-router';
import { Text } from '../../components/ui/Text';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Overview</Text>
          ),
          tabBarAccessibilityLabel: 'Overview tab',
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Users</Text>
          ),
          tabBarAccessibilityLabel: 'Users tab',
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Models</Text>
          ),
          tabBarAccessibilityLabel: 'Models tab',
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Alerts</Text>
          ),
          tabBarAccessibilityLabel: 'Alerts tab',
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Audit</Text>
          ),
          tabBarAccessibilityLabel: 'Audit tab',
        }}
      />
    </Tabs>
  );
}
