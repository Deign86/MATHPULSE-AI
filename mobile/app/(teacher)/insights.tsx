import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getAIInsights, type AIInsight } from '../../services/teacherService';

const MOCK: AIInsight[] = [
  {
    id: 'i1',
    title: 'Functions topic struggling across STEM-A',
    body: '23 of 42 students scored below 60% on the derivatives quiz. Recommend reviewing chain rule and offering a remedial lesson this week.',
    severity: 'critical',
    category: 'mastery',
    generatedAt: '2026-06-01T08:00:00Z',
    classId: 'c1',
  },
  {
    id: 'i2',
    title: 'High engagement in Business Math lessons',
    body: 'Average session time is up 32% week-over-week. The new "Interest & Annuities" module is driving strong engagement.',
    severity: 'info',
    category: 'engagement',
    generatedAt: '2026-05-31T14:30:00Z',
    classId: 'c2',
  },
  {
    id: 'i3',
    title: '3 students in STEM-A trending toward risk',
    body: 'Carlo Mendoza, Patricia Cruz, and Roberto Garcia show declining patterns. Consider 1-on-1 check-ins this week.',
    severity: 'warning',
    category: 'risk',
    generatedAt: '2026-05-30T10:15:00Z',
  },
  {
    id: 'i4',
    title: 'Logic module ready for advanced content',
    body: 'STEM-A Logic students average 87% on foundational topics. Consider unlocking the advanced propositional logic module.',
    severity: 'info',
    category: 'opportunity',
    generatedAt: '2026-05-29T16:00:00Z',
    classId: 'c3',
  },
];

const SEVERITY_VARIANT: Record<string, 'destructive' | 'warning' | 'default'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'default',
};

const CATEGORY_ICON: Record<string, string> = {
  engagement: '📈',
  mastery: '🎯',
  risk: '⚠️',
  opportunity: '✨',
};

export default function InsightsScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [insights, setInsights] = useState<AIInsight[]>(MOCK);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!teacherProfile) return;
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAIInsights(teacherProfile.uid, token).catch(() => null);
      if (data) setInsights(data);
    } finally {
      setRefreshing(false);
    }
  }, [teacherProfile]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          AI-generated insights for your classes · {insights.length} new
        </Text>
      </View>

      <View className="px-4 gap-3">
        {insights.map((insight) => (
          <Card key={insight.id} className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-row items-start flex-1 mr-3">
                <Text className="text-2xl mr-3">{CATEGORY_ICON[insight.category]}</Text>
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold mb-1">{insight.title}</Text>
                  <Text className="text-muted-foreground text-xs leading-relaxed">{insight.body}</Text>
                </View>
              </View>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-border">
              <Badge variant={SEVERITY_VARIANT[insight.severity]}>
                {insight.severity}
              </Badge>
              <Text className="text-muted-foreground text-[10px]">
                {new Date(insight.generatedAt).toLocaleDateString()}
              </Text>
            </View>
          </Card>
        ))}
        {insights.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-muted-foreground text-sm">No new insights</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
