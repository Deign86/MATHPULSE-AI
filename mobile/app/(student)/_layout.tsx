import { Tabs } from 'expo-router';
import { Text } from '../../components/ui/Text';

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
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
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Home</Text>
          ),
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Progress</Text>
          ),
          tabBarAccessibilityLabel: 'Progress tab',
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quizzes',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Quiz</Text>
          ),
          tabBarAccessibilityLabel: 'Quizzes tab',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Tutor',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Chat</Text>
          ),
          tabBarAccessibilityLabel: 'AI Tutor tab',
        }}
      />
      <Tabs.Screen
        name="quiz-battle"
        options={{
          title: 'Battle',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Battle</Text>
          ),
          tabBarAccessibilityLabel: 'Quiz Battle tab',
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>Rewards</Text>
          ),
          tabBarAccessibilityLabel: 'Rewards tab',
        }}
      />
    </Tabs>
  );
}
