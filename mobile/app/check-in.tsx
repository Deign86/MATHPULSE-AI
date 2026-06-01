import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/useAuthStore';
import { useGamificationStore } from '../stores/useGamificationStore';
import {
  submitCheckIn,
  getTodayCheckIn,
  getUserStreak,
  CHECK_IN_XP,
  CHECK_IN_SOURCE,
  CHECK_IN_REASON,
} from '../services/checkInService';
import type { Mood, CheckInRecord } from '../services/checkInService';

// ─── Mood Definitions (no emoji — colored circles) ─────────────────────────

const MOODS: { key: Mood; label: string; activeBg: string; inactiveBg: string; ring: string }[] = [
  { key: 'great',       label: 'Great',       activeBg: 'bg-emerald-500',   inactiveBg: 'bg-emerald-500/20', ring: 'ring-emerald-500' },
  { key: 'good',        label: 'Good',        activeBg: 'bg-blue-500',      inactiveBg: 'bg-blue-500/20',    ring: 'ring-blue-500' },
  { key: 'okay',        label: 'Okay',        activeBg: 'bg-amber-500',     inactiveBg: 'bg-amber-500/20',   ring: 'ring-amber-500' },
  { key: 'struggling',  label: 'Struggling',  activeBg: 'bg-orange-500',    inactiveBg: 'bg-orange-500/20',  ring: 'ring-orange-500' },
  { key: 'stressed',    label: 'Stressed',    activeBg: 'bg-red-500',       inactiveBg: 'bg-red-500/20',     ring: 'ring-red-500' },
];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const user = useAuthStore((s) => s.user);
  const addXP = useGamificationStore((s) => s.addXP);

  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInRecord | null>(null);
  const [streak, setStreak] = useState(0);

  // ── On mount: check today's status ──────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    loadTodayStatus(user.uid);
  }, [user?.uid]);

  const loadTodayStatus = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      const [existing, streakVal] = await Promise.all([
        getTodayCheckIn(uid),
        getUserStreak(uid),
      ]);
      setTodayCheckIn(existing);
      setStreak(streakVal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load check-in status');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!mood || !user?.uid) return;
    setSubmitting(true);
    setError(null);
    try {
      const record = await submitCheckIn(user.uid, mood, note || undefined);
      await addXP(user.uid, CHECK_IN_XP, CHECK_IN_SOURCE, CHECK_IN_REASON);
      setTodayCheckIn(record);
      setStreak(record.streakDay);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  }, [mood, note, user?.uid, addXP]);

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <View className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <Text className="text-muted-foreground mt-4">Loading...</Text>
      </View>
    );
  }

  // ── Already checked in ──────────────────────────────────────────────────

  if (todayCheckIn) {
    const moodDef = MOODS.find((m) => m.key === todayCheckIn.mood);
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <View className="h-16 w-16 rounded-full bg-primary/20 items-center justify-center mb-4">
          <View className={`h-10 w-10 rounded-full ${moodDef?.activeBg ?? 'bg-primary'}`} />
        </View>

        <Text variant="h2" className="text-foreground mb-2 text-center">
          Come back tomorrow!
        </Text>

        <Card className="w-full max-w-sm mb-4">
          <View className="flex-row items-center gap-3 mb-2">
            <View className={`h-4 w-4 rounded-full ${moodDef?.activeBg ?? 'bg-muted-foreground'}`} />
            <Text className="text-foreground font-semibold">
              {moodDef?.label ?? 'Unknown'}
            </Text>
          </View>

          {todayCheckIn.note ? (
            <Text className="text-muted-foreground text-sm">{todayCheckIn.note}</Text>
          ) : (
            <Text className="text-muted-foreground italic text-sm">No note added</Text>
          )}

          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
            <Text className="text-xs text-muted-foreground">
              Streak: {streak} day{streak !== 1 ? 's' : ''}
            </Text>
            <Text className="text-xs text-muted-foreground">
              +{CHECK_IN_XP} XP earned
            </Text>
          </View>
        </Card>

        <Text className="text-muted-foreground text-sm text-center">
          Great job checking in today. See you tomorrow!
        </Text>
      </View>
    );
  }

  // ── Check-in form ───────────────────────────────────────────────────────

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Daily Check-in</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          How are you feeling about math today
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}?
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          Current streak: {streak} day{streak !== 1 ? 's' : ''} &middot; +{CHECK_IN_XP} XP on submit
        </Text>
      </View>

      {/* Error */}
      {error ? (
        <View className="mx-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      ) : null}

      {/* Mood selector */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">How do you feel?</Text>
        <View className="flex-row flex-wrap gap-3">
          {MOODS.map((m) => {
            const selected = mood === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(m.key)}
                className="items-center gap-2 min-w-[60]"
              >
                <View
                  className={`h-12 w-12 rounded-full items-center justify-center
                    ${selected ? m.activeBg : m.inactiveBg}
                    ${selected ? 'ring-2 ring-offset-2 ring-offset-background ' + m.ring : ''}`}
                />
                <Text
                  className={`text-xs font-medium ${selected ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Note */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Notes (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What's on your mind? Anything challenging or exciting?"
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={4}
          className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground text-sm"
          style={{ textAlignVertical: 'top', minHeight: 100 }}
        />
      </View>

      {/* Submit */}
      <View className="px-4">
        <Button onPress={handleSubmit} loading={submitting} disabled={!mood}>
          Submit Check-in
        </Button>
        {!mood ? (
          <Text className="text-muted-foreground text-xs text-center mt-2">
            Select a mood to continue
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
