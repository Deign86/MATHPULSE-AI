import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getAIInsights, type AIInsight } from '../../services/teacherService';

const SEVERITY_VARIANT: Record<string, 'destructive' | 'warning' | 'default'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'default',
};

const CATEGORY_LABEL: Record<string, string> = {
  engagement: 'Engagement',
  mastery: 'Mastery',
  risk: 'Risk',
  opportunity: 'Opportunity',
};

export default function InsightsScreen() {
  const teacherProfile = useAuthStore((s) => s.teacherProfile);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!teacherProfile) return;
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAIInsights(teacherProfile.uid, token);
      setInsights(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load insights';
      setError(message);
    }
  }, [teacherProfile]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-muted-foreground text-sm mt-3">Loading insights...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          AI-generated insights for your classes - {insights.length} new
        </Text>
      </View>

      {error && (
        <View className="px-4 mb-4">
          <Card className="p-3 bg-error/10 border border-error/30">
            <Text className="text-error text-sm">{error}</Text>
          </Card>
        </View>
      )}

      <View className="px-4 gap-3">
        {insights.map((insight) => (
          <Card key={insight.id} className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-row items-start flex-1 mr-3">
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold mb-1">{insight.title}</Text>
                  <Text className="text-muted-foreground text-xs leading-relaxed">{insight.body}</Text>
                </View>
              </View>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-border">
              <View className="flex-row gap-2">
                <Badge variant={SEVERITY_VARIANT[insight.severity]}>
                  {insight.severity}
                </Badge>
                <Badge variant="secondary">
                  {CATEGORY_LABEL[insight.category] || insight.category}
                </Badge>
              </View>
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
