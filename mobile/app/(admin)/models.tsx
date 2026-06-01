import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Switch, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth } from '../../lib/firebase';
import { getModelConfigs, updateModelConfig, type ModelConfig } from '../../services/adminService';

const MOCK: ModelConfig[] = [
  {
    id: 'm1',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    enabled: true,
    useFor: ['rag', 'analytics'],
    rateLimitPerMinute: 60,
    dailyTokenBudget: 5_000_000,
    tokensUsedToday: 2_180_000,
  },
  {
    id: 'm2',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    enabled: true,
    useFor: ['chat', 'quiz_generation'],
    rateLimitPerMinute: 120,
    dailyTokenBudget: 10_000_000,
    tokensUsedToday: 4_120_000,
  },
  {
    id: 'm3',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    model: 'gpt-4-turbo',
    enabled: false,
    useFor: ['insights'],
    rateLimitPerMinute: 30,
    dailyTokenBudget: 1_000_000,
    tokensUsedToday: 0,
  },
  {
    id: 'm4',
    name: 'Local RAG Embeddings',
    provider: 'local',
    model: 'BAAI/bge-small-en-v1.5',
    enabled: true,
    useFor: ['rag'],
    rateLimitPerMinute: 500,
    dailyTokenBudget: 100_000_000,
    tokensUsedToday: 12_400_000,
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  deepseek: 'bg-blue-500/15 border-blue-500/30',
  openai: 'bg-emerald-500/15 border-emerald-500/30',
  anthropic: 'bg-orange-500/15 border-orange-500/30',
  local: 'bg-slate-500/15 border-slate-500/30',
};

export default function AdminModelsScreen() {
  const adminProfile = useAuthStore((s) => s.adminProfile);
  const [models, setModels] = useState<ModelConfig[]>(MOCK);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getModelConfigs(token).catch(() => null);
      if (data) setModels(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleToggle = useCallback(async (model: ModelConfig) => {
    setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m)));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await updateModelConfig(model.id, !model.enabled, token);
    } catch {
      // revert on failure
      setModels((prev) => prev.map((m) => (m.id === model.id ? model : m)));
    }
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      <View className="px-4 pt-4 pb-3">
        <Text className="text-muted-foreground text-sm">
          {models.filter((m) => m.enabled).length} of {models.length} models enabled
        </Text>
      </View>

      <View className="px-4 gap-3">
        {models.map((m) => {
          const usagePercent = (m.tokensUsedToday / m.dailyTokenBudget) * 100;
          return (
            <Card key={m.id} className="p-4">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-foreground text-base font-semibold">{m.name}</Text>
                    <View className={`px-2 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider]}`}>
                      <Text className="text-foreground text-[10px] capitalize">{m.provider}</Text>
                    </View>
                  </View>
                  <Text className="text-muted-foreground text-xs">{m.model}</Text>
                </View>
                <Switch
                  value={m.enabled}
                  onValueChange={() => handleToggle(m)}
                  trackColor={{ false: '#1e293b', true: '#6366f1' }}
                  thumbColor={m.enabled ? '#a78bfa' : '#64748b'}
                />
              </View>

              <View className="flex-row flex-wrap gap-1 mb-3">
                {m.useFor.map((u) => (
                  <Badge key={u} variant="secondary">{u.replace('_', ' ')}</Badge>
                ))}
              </View>

              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground text-xs">Today's token usage</Text>
                  <Text className="text-foreground text-xs font-semibold">
                    {(m.tokensUsedToday / 1_000_000).toFixed(2)}M / {(m.dailyTokenBudget / 1_000_000).toFixed(0)}M
                  </Text>
                </View>
                <Progress
                  value={Math.min(usagePercent, 100)}
                  className="h-1.5"
                  indicatorClassName={usagePercent > 80 ? 'bg-red-400' : usagePercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'}
                />
                <Text className="text-muted-foreground text-[10px] mt-1">
                  Rate limit: {m.rateLimitPerMinute} req/min
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
