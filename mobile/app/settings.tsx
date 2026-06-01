import React, { useState } from 'react';
import { View, ScrollView, Switch, Alert } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [achievementNotifs, setAchievementNotifs] = useState(true);
  const [quizNotifs, setQuizNotifs] = useState(true);
  const [dailyRewardNotifs, setDailyRewardNotifs] = useState(true);
  const [assignmentNotifs, setAssignmentNotifs] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Settings</Text>
      </View>

      {/* Notifications */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Notifications</Text>
        <Card className="p-4 gap-3">
          <ToggleRow
            label="Push Notifications"
            description="Master toggle for all push notifications"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <View className="h-px bg-border" />
          <ToggleRow label="Achievements" value={achievementNotifs} onValueChange={setAchievementNotifs} />
          <ToggleRow label="Quiz Reminders" value={quizNotifs} onValueChange={setQuizNotifs} />
          <ToggleRow label="Daily Rewards" value={dailyRewardNotifs} onValueChange={setDailyRewardNotifs} />
          <ToggleRow label="Assignments" value={assignmentNotifs} onValueChange={setAssignmentNotifs} />
          <ToggleRow label="Streak Alerts" value={streakAlerts} onValueChange={setStreakAlerts} />
        </Card>
      </View>

      {/* Communication */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Communication</Text>
        <Card className="p-4 gap-3">
          <ToggleRow
            label="Email Notifications"
            description="Weekly progress digest and important updates"
            value={emailNotifs}
            onValueChange={setEmailNotifs}
          />
          <View className="h-px bg-border" />
          <ToggleRow label="Sound Effects" value={soundEnabled} onValueChange={setSoundEnabled} />
        </Card>
      </View>

      {/* Appearance */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Appearance</Text>
        <Card className="p-4 gap-3">
          <ToggleRow
            label="Dark Mode"
            description="Currently the only theme"
            value={darkMode}
            onValueChange={setDarkMode}
            disabled
          />
          <View className="h-px bg-border" />
          <ToggleRow label="Haptic Feedback" value={hapticsEnabled} onValueChange={setHapticsEnabled} />
        </Card>
      </View>

      {/* About */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">About</Text>
        <Card className="p-4">
          <View className="gap-2">
            <InfoRow label="App" value="MathPulse AI" />
            <InfoRow label="Version" value="1.0.0 (MVP)" />
            <InfoRow label="Build" value="Expo SDK 51" />
            <InfoRow label="Backend" value="deign86-mathpulse-api-v3test" />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
          {label}
        </Text>
        {description && (
          <Text className="text-muted-foreground text-xs mt-0.5">{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#1e293b', true: '#6366f1' }}
        thumbColor={value ? '#a78bfa' : '#64748b'}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-1">
      <Text className="text-muted-foreground text-xs">{label}</Text>
      <Text className="text-foreground text-sm font-semibold">{value}</Text>
    </View>
  );
}
