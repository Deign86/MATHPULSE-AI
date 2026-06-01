import React, { useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/useAuthStore';
import { useGamificationStore } from '../stores/useGamificationStore';

type Mood = 'great' | 'good' | 'okay' | 'struggling' | 'stressed';

const MOODS: { key: Mood; emoji: string; label: string; color: string }[] = [
  { key: 'great', emoji: '😄', label: 'Great', color: 'bg-emerald-500/15 border-emerald-500/40' },
  { key: 'good', emoji: '🙂', label: 'Good', color: 'bg-blue-500/15 border-blue-500/40' },
  { key: 'okay', emoji: '😐', label: 'Okay', color: 'bg-amber-500/15 border-amber-500/40' },
  { key: 'struggling', emoji: '😣', label: 'Struggling', color: 'bg-orange-500/15 border-orange-500/40' },
  { key: 'stressed', emoji: '😫', label: 'Stressed', color: 'bg-red-500/15 border-red-500/40' },
];

const STUDY_MINUTES = [15, 30, 45, 60, 90, 120];

export default function CheckInScreen() {
  const user = useAuthStore((s) => s.user);
  const addXP = useGamificationStore((s) => s.addXP);
  const [mood, setMood] = useState<Mood | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!mood || !minutes) {
      Alert.alert('Missing info', 'Please select a mood and study duration');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      addXP(10);
      setDone(true);
      setSubmitting(false);
    }, 600);
  }, [mood, minutes, addXP]);

  if (done) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Text className="text-6xl mb-4">✨</Text>
        <Text variant="h2" className="text-foreground mb-2 text-center">Check-in complete!</Text>
        <Text className="text-muted-foreground text-center mb-6">
          +10 XP earned. See you tomorrow!
        </Text>
        <Button onPress={() => { setDone(false); setMood(null); setMinutes(null); setNote(''); }}>
          Done
        </Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Daily Check-in</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          How are you feeling about math today{user?.name ? `, ${user.name.split(' ')[0]}` : ''}?
        </Text>
      </View>

      {/* Mood */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">How do you feel?</Text>
        <View className="flex-row flex-wrap gap-3">
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMood(m.key)}
              className={`flex-1 min-w-[30%] rounded-2xl border p-3 items-center ${
                mood === m.key ? m.color : 'bg-surface border-border'
              }`}
            >
              <Text className="text-3xl mb-1">{m.emoji}</Text>
              <Text className={`text-xs font-semibold ${mood === m.key ? 'text-foreground' : 'text-muted-foreground'}`}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Study minutes */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">How long did you study today?</Text>
        <View className="flex-row flex-wrap gap-2">
          {STUDY_MINUTES.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMinutes(m)}
              className={`px-4 py-3 rounded-xl ${
                minutes === m ? 'bg-primary' : 'bg-surface border border-border'
              }`}
            >
              <Text className={`text-sm font-semibold ${minutes === m ? 'text-primary-foreground' : 'text-foreground'}`}>
                {m}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Note */}
      <View className="px-4 mb-6">
        <Text variant="h3" className="text-foreground mb-3">Notes (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did you learn? What's challenging?"
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={4}
          className="bg-surface border border-border rounded-2xl px-4 py-3 text-foreground text-sm"
          style={{ textAlignVertical: 'top', minHeight: 100 }}
        />
      </View>

      <View className="px-4">
        <Button onPress={handleSubmit} loading={submitting}>
          Submit Check-in
        </Button>
      </View>
    </ScrollView>
  );
}
