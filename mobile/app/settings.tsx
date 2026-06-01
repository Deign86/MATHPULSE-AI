import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Switch } from '../components/ui/Switch';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  changeEmail,
  changePassword,
  deleteAccount,
  exportUserData,
} from '../services/settingsService';
import type { ProfileVisibility } from '../types/models';

const PROFILE_VISIBILITY_OPTIONS: { label: string; value: ProfileVisibility }[] = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'Students and Staff', value: 'students_and_staff' },
  { label: 'Private', value: 'private' },
];

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const settings = useSettingsStore((s) => s.settings);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const error = useSettingsStore((s) => s.error);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const clearError = useSettingsStore((s) => s.clearError);

  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modal state
  const [reauthModalVisible, setReauthModalVisible] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'changeEmail' | 'changePassword' | 'deleteAccount' | null
  >(null);

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadSettings(user.uid);
    }
  }, [user?.uid, loadSettings]);

  const dismissAllErrors = useCallback(() => {
    clearError();
    setReauthError(null);
  }, [clearError]);

  const handleExport = useCallback(async () => {
    if (!user?.uid) return;
    setExporting(true);
    try {
      const data = await exportUserData(user.uid);
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'MathPulse Data Export',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setReauthError(message);
    } finally {
      setExporting(false);
    }
  }, [user?.uid]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      await resetSettings();
    } finally {
      setResetting(false);
    }
  }, [resetSettings]);

  const openReauth = useCallback(
    (action: 'changeEmail' | 'changePassword' | 'deleteAccount') => {
      setPendingAction(action);
      setReauthPassword('');
      setReauthError(null);
      setReauthModalVisible(true);
    },
    [],
  );

  const closeReauth = useCallback(() => {
    setReauthModalVisible(false);
    setPendingAction(null);
    setReauthPassword('');
    setReauthError(null);
  }, []);

  const submitReauth = useCallback(() => {
    if (!reauthPassword) {
      setReauthError('Password is required');
      return;
    }
    setReauthError(null);
    setReauthModalVisible(false);

    if (pendingAction === 'changeEmail') {
      setNewEmail('');
      setEmailModalVisible(true);
    } else if (pendingAction === 'changePassword') {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(true);
    } else if (pendingAction === 'deleteAccount') {
      setDeleteConfirmVisible(true);
    }
  }, [pendingAction, reauthPassword]);

  const submitChangeEmail = useCallback(async () => {
    if (!newEmail || !reauthPassword) return;
    try {
      await changeEmail(reauthPassword, newEmail);
      setEmailModalVisible(false);
      setNewEmail('');
      setReauthPassword('');
      setReauthError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change email';
      setReauthError(message);
    }
  }, [newEmail, reauthPassword]);

  const submitChangePassword = useCallback(async () => {
    if (!newPassword || !reauthPassword) return;
    if (newPassword !== confirmPassword) {
      setReauthError('Passwords do not match');
      return;
    }
    try {
      await changePassword(reauthPassword, newPassword);
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      setReauthPassword('');
      setReauthError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setReauthError(message);
    }
  }, [newPassword, confirmPassword, reauthPassword]);

  const submitDeleteAccount = useCallback(async () => {
    if (!user?.uid || !reauthPassword) return;
    setDeleting(true);
    try {
      await deleteAccount(reauthPassword, user.uid);
      setDeleteConfirmVisible(false);
      setReauthPassword('');
      setReauthError(null);
      logout();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      setReauthError(message);
    } finally {
      setDeleting(false);
    }
  }, [user?.uid, reauthPassword, logout]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text variant="h3" className="text-foreground text-center">
          Please sign in to manage settings.
        </Text>
      </View>
    );
  }

  if (isLoading && !settings) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-muted-foreground text-sm mt-3">Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Settings</Text>
      </View>

      {error && (
        <View className="px-4 mb-4">
          <Card className="p-3 bg-error/10 border border-error/30">
            <Text className="text-error text-sm">{error}</Text>
            <Button variant="ghost" size="sm" onPress={dismissAllErrors} className="mt-2">
              Dismiss
            </Button>
          </Card>
        </View>
      )}

      {/* Appearance */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Appearance</Text>
        <Card className="p-4 gap-4">
          <ToggleRow
            label="Dark Mode"
            description="Use dark color scheme across the app"
            value={settings.appearance.darkMode}
            onValueChange={(v) => updateSetting('appearance.darkMode', v)}
          />
          <View className="h-px bg-border" />
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Font Size</Text>
            <Text className="text-xs text-muted-foreground">Current: {settings.appearance.fontSize}px</Text>
            <Slider
              value={settings.appearance.fontSize}
              min={12}
              max={24}
              step={1}
              onValueChange={(v) => updateSetting('appearance.fontSize', v)}
            />
          </View>
          <View className="h-px bg-border" />
          <ToggleRow
            label="Compact View"
            description="Reduce padding and margins for denser layout"
            value={settings.appearance.compactView}
            onValueChange={(v) => updateSetting('appearance.compactView', v)}
          />
          <View className="h-px bg-border" />
          <ToggleRow
            label="Reduce Animations"
            description="Minimize motion effects for accessibility"
            value={settings.appearance.reduceAnimations}
            onValueChange={(v) => updateSetting('appearance.reduceAnimations', v)}
          />
        </Card>
      </View>

      {/* Notifications */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Notifications</Text>
        <Card className="p-4 gap-4">
          <ToggleRow
            label="Push Notifications"
            description="Master toggle for all push notifications"
            value={settings.pushPreferences.pushEnabled}
            onValueChange={(v) => updateSetting('pushPreferences.pushEnabled', v)}
          />
          <View className="h-px bg-border" />
          <ToggleRow
            label="Email Notifications"
            description="Weekly progress digest and important updates"
            value={settings.notifications.emailNotifications}
            onValueChange={(v) => updateSetting('notifications.emailNotifications', v)}
          />
          <ToggleRow
            label="Sound Effects"
            value={settings.notifications.soundEnabled}
            onValueChange={(v) => updateSetting('notifications.soundEnabled', v)}
          />
          <View className="h-px bg-border" />
          <Text className="text-sm font-medium text-foreground mb-1">Notification Types</Text>
          <ToggleRow
            label="Quiz Reminders"
            value={settings.notifications.notificationTypes.quizReminders}
            onValueChange={(v) => updateSetting('notifications.notificationTypes.quizReminders', v)}
            disabled={!settings.pushPreferences.pushEnabled}
          />
          <ToggleRow
            label="New Content"
            value={settings.notifications.notificationTypes.newContent}
            onValueChange={(v) => updateSetting('notifications.notificationTypes.newContent', v)}
            disabled={!settings.pushPreferences.pushEnabled}
          />
          <ToggleRow
            label="Achievements"
            value={settings.notifications.notificationTypes.achievements}
            onValueChange={(v) => updateSetting('notifications.notificationTypes.achievements', v)}
            disabled={!settings.pushPreferences.pushEnabled}
          />
          <ToggleRow
            label="Streak Alerts"
            value={settings.notifications.notificationTypes.streakAlerts}
            onValueChange={(v) => updateSetting('notifications.notificationTypes.streakAlerts', v)}
            disabled={!settings.pushPreferences.pushEnabled}
          />
          <ToggleRow
            label="Weekly Summary"
            value={settings.notifications.notificationTypes.weeklySummary}
            onValueChange={(v) => updateSetting('notifications.notificationTypes.weeklySummary', v)}
            disabled={!settings.pushPreferences.pushEnabled}
          />
        </Card>
      </View>

      {/* Privacy */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Privacy</Text>
        <Card className="p-4 gap-4">
          <PressableRow
            label="Profile Visibility"
            value={visibilityLabel(settings.privacy.profileVisibility)}
            onPress={() => setVisibilityModalVisible(true)}
          />
          <View className="h-px bg-border" />
          <ToggleRow
            label="Show Activity Status"
            description="Let others see when you are active"
            value={settings.privacy.showActivityStatus}
            onValueChange={(v) => updateSetting('privacy.showActivityStatus', v)}
          />
          <ToggleRow
            label="Data Sharing"
            description="Allow anonymized usage data to improve the app"
            value={settings.privacy.dataSharing}
            onValueChange={(v) => updateSetting('privacy.dataSharing', v)}
          />
        </Card>
      </View>

      {/* Account */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Account</Text>
        <Card className="p-4 gap-3">
          <Button variant="outline" onPress={() => openReauth('changeEmail')}>
            Change Email
          </Button>
          <Button variant="outline" onPress={() => openReauth('changePassword')}>
            Change Password
          </Button>
          <Button variant="destructive" onPress={() => openReauth('deleteAccount')}>
            Delete Account
          </Button>
        </Card>
      </View>

      {/* Data Management */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Data Management</Text>
        <Card className="p-4 gap-3">
          <Button loading={exporting} onPress={handleExport}>
            Export Data
          </Button>
          <Button variant="outline" loading={resetting} onPress={handleReset}>
            Reset to Defaults
          </Button>
        </Card>
      </View>

      {/* About */}
      <View className="px-4 mb-6">
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

      {/* Profile Visibility Modal */}
      <Modal visible={visibilityModalVisible} onClose={() => setVisibilityModalVisible(false)}>
        <View className="gap-4 p-2">
          <Text variant="h3" className="text-foreground">Profile Visibility</Text>
          {PROFILE_VISIBILITY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={settings.privacy.profileVisibility === opt.value ? 'default' : 'outline'}
              onPress={() => {
                updateSetting('privacy.profileVisibility', opt.value);
                setVisibilityModalVisible(false);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </View>
      </Modal>

      {/* Re-auth Modal */}
      <Modal visible={reauthModalVisible} onClose={closeReauth}>
        <View className="gap-4 p-2">
          <Text variant="h3" className="text-foreground">Verify Identity</Text>
          <Text className="text-muted-foreground text-sm">
            Enter your current password to continue.
          </Text>
          <Input
            placeholder="Current password"
            secureTextEntry
            value={reauthPassword}
            onChangeText={setReauthPassword}
            autoCapitalize="none"
          />
          {reauthError && <Text className="text-error text-sm">{reauthError}</Text>}
          <Button onPress={submitReauth}>Continue</Button>
          <Button variant="ghost" onPress={closeReauth}>
            Cancel
          </Button>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={emailModalVisible}
        onClose={() => {
          setEmailModalVisible(false);
          setReauthError(null);
        }}
      >
        <View className="gap-4 p-2">
          <Text variant="h3" className="text-foreground">Change Email</Text>
          <Input
            placeholder="New email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />
          {reauthError && <Text className="text-error text-sm">{reauthError}</Text>}
          <Button onPress={submitChangeEmail}>Update Email</Button>
          <Button
            variant="ghost"
            onPress={() => {
              setEmailModalVisible(false);
              setReauthError(null);
            }}
          >
            Cancel
          </Button>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        onClose={() => {
          setPasswordModalVisible(false);
          setReauthError(null);
        }}
      >
        <View className="gap-4 p-2">
          <Text variant="h3" className="text-foreground">Change Password</Text>
          <Input
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Input
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {reauthError && <Text className="text-error text-sm">{reauthError}</Text>}
          <Button onPress={submitChangePassword}>Update Password</Button>
          <Button
            variant="ghost"
            onPress={() => {
              setPasswordModalVisible(false);
              setReauthError(null);
            }}
          >
            Cancel
          </Button>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        onClose={() => {
          setDeleteConfirmVisible(false);
          setReauthError(null);
        }}
      >
        <View className="gap-4 p-2">
          <Text variant="h3" className="text-foreground text-error">Delete Account</Text>
          <Text className="text-muted-foreground text-sm">
            This will permanently delete your account and all associated data. This action cannot be undone.
          </Text>
          {reauthError && <Text className="text-error text-sm">{reauthError}</Text>}
          <Button variant="destructive" loading={deleting} onPress={submitDeleteAccount}>
            Permanently Delete Account
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setDeleteConfirmVisible(false);
              setReauthError(null);
            }}
          >
            Cancel
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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
        <Text
          className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-muted-foreground text-xs mt-0.5">{description}</Text>
        )}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
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

function PressableRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      </View>
      <Button variant="ghost" size="sm" onPress={onPress}>
        {value}
      </Button>
    </View>
  );
}

function visibilityLabel(v: ProfileVisibility): string {
  const found = PROFILE_VISIBILITY_OPTIONS.find((o) => o.value === v);
  return found?.label ?? v;
}
