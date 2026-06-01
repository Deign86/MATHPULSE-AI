import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Progress } from '../../../components/ui/Progress';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { auth } from '../../../lib/firebase';

interface StudentDetail {
  uid: string;
  name: string;
  grade: string;
  section: string;
  lrn?: string;
  school?: string;
  level: number;
  currentXP: number;
  totalXP: number;
  averageScore: number;
  overallRisk: 'High' | 'Medium' | 'Low';
  atRiskSubjects: string[];
  subjectBadges: Record<string, 'At Risk' | 'On Track'>;
  recentQuizScores: { quiz: string; score: number; date: string }[];
  flaggedTopics: string[];
  recommendedPace?: 'support_intensive' | 'normal' | 'accelerated';
}

const MOCK: StudentDetail = {
  uid: 's1',
  name: 'Carlo Mendoza',
  grade: '11',
  section: 'A',
  lrn: '123456789012',
  school: 'Manila Science High School',
  level: 12,
  currentXP: 2350,
  totalXP: 4800,
  averageScore: 52,
  overallRisk: 'High',
  atRiskSubjects: ['Functions', 'Business Math'],
  subjectBadges: { Functions: 'At Risk', 'Business Math': 'At Risk', Logic: 'On Track' },
  recentQuizScores: [
    { quiz: 'Derivatives Quiz', score: 42, date: '2026-05-28' },
    { quiz: 'Chain Rule Quiz', score: 55, date: '2026-05-21' },
    { quiz: 'Limits Quiz', score: 48, date: '2026-05-14' },
  ],
  flaggedTopics: ['Chain Rule', 'Derivative Notation', 'Logarithms'],
  recommendedPace: 'support_intensive',
};

const RISK_VARIANT: Record<string, 'destructive' | 'warning' | 'success'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'success',
};

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail>(MOCK);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Real API call wires up when backend ready
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, []);

  const xpInLevel = student.currentXP % 100;
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Header */}
      <View className="items-center pt-8 pb-6">
        <Avatar fallback={student.name} size="xl" className="mb-3" />
        <Text variant="h2" className="text-foreground">{student.name}</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Grade {student.grade} · Sec {student.section} · LRN {student.lrn ?? '—'}
        </Text>
        <View className="flex-row gap-2 mt-3">
          <Badge variant={RISK_VARIANT[student.overallRisk]}>
            {student.overallRisk} Risk
          </Badge>
          {student.recommendedPace && (
            <Badge variant="outline">
              {student.recommendedPace === 'support_intensive' ? '🆘 Intensive Support' :
               student.recommendedPace === 'accelerated' ? '🚀 Accelerated' : 'Normal Pace'}
            </Badge>
          )}
        </View>
      </View>

      {/* XP progress */}
      <View className="px-4 mb-4">
        <Card className="p-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-foreground text-sm font-semibold">Level {student.level} Progress</Text>
            <Text className="text-muted-foreground text-xs">
              {student.currentXP.toLocaleString()} / {student.totalXP.toLocaleString()} XP
            </Text>
          </View>
          <Progress value={(student.currentXP / student.totalXP) * 100} className="h-2" />
        </Card>
      </View>

      {/* Performance stats */}
      <View className="flex-row px-4 gap-3 mb-4">
        <Card className="flex-1 p-4 bg-blue-500/10 border border-blue-500/30">
          <Text className="text-blue-300 text-xs mb-1">Average</Text>
          <Text className="text-foreground text-2xl font-bold">{student.averageScore}%</Text>
        </Card>
        <Card className="flex-1 p-4 bg-violet-500/10 border border-violet-500/30">
          <Text className="text-violet-300 text-xs mb-1">Level</Text>
          <Text className="text-foreground text-2xl font-bold">{student.level}</Text>
        </Card>
      </View>

      {/* Subject badges */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Subject Mastery</Text>
        <Card className="p-4">
          <View className="gap-2">
            {Object.entries(student.subjectBadges).map(([subject, badge]) => (
              <View key={subject} className="flex-row items-center justify-between py-1">
                <Text className="text-foreground text-sm">{subject}</Text>
                <Badge variant={badge === 'On Track' ? 'success' : 'destructive'}>
                  {badge}
                </Badge>
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* Recent quizzes */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Recent Quiz Performance</Text>
        <View className="gap-2">
          {student.recentQuizScores.map((q, i) => {
            const scoreColor = q.score >= 75 ? 'text-emerald-400' : q.score >= 60 ? 'text-amber-400' : 'text-red-400';
            return (
              <Card key={i} className="p-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold">{q.quiz}</Text>
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    {new Date(q.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text className={`text-lg font-bold ${scoreColor}`}>{q.score}%</Text>
              </Card>
            );
          })}
        </View>
      </View>

      {/* Flagged topics */}
      {student.flaggedTopics.length > 0 && (
        <View className="px-4 mb-4">
          <Text variant="h3" className="text-foreground mb-3">Flagged Topics</Text>
          <View className="flex-row flex-wrap gap-2">
            {student.flaggedTopics.map((t) => (
              <View key={t} className="bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1">
                <Text className="text-red-300 text-xs">⚠️ {t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="px-4 gap-3">
        <Button>📧 Message Student</Button>
        <Button variant="outline" onPress={() => router.back()}>← Back to Students</Button>
      </View>
    </ScrollView>
  );
}
