import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { router, useFocusEffect } from 'expo-router';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { getAvailableQuizzes } from '../../services/quizService';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  xpReward: number;
  questionCount: number;
}

function SkeletonCard() {
  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 animate-pulse">
      <View className="h-4 bg-muted rounded w-3/4 mb-2" />
      <View className="h-3 bg-muted rounded w-1/2 mb-3" />
      <View className="flex-row justify-between items-center">
        <View className="h-5 w-16 bg-muted rounded-full" />
        <View className="h-4 w-12 bg-muted rounded" />
      </View>
    </View>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'medium':
      return 'bg-amber-500/20 text-amber-400';
    case 'hard':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function QuizListScreen() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user);

  const fetchQuizzes = useCallback(async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAvailableQuizzes(user.uid, token);
      setQuizzes(data);
    } catch (err) {
      // Silently fail — quizzes remain empty / stale
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchQuizzes();
    }, [fetchQuizzes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuizzes();
  }, [fetchQuizzes]);

  if (isLoading && quizzes.length === 0) {
    return (
      <View className="flex-1 bg-background p-4 pt-12">
        <Text variant="h2" className="text-foreground mb-6">
          Quizzes
        </Text>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-4 pt-12">
      <Text variant="h2" className="text-foreground mb-6">
        Quizzes
      </Text>

      <FlatList
        data={quizzes}
        keyExtractor={(q) => q.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
          />
        }
        renderItem={({ item }: { item: Quiz }) => (
          <TouchableOpacity
            className="bg-surface rounded-2xl p-4 mb-3"
            onPress={() => router.push(`/student/quiz/${item.id}`)}
            accessibilityRole="link"
            accessibilityLabel={`${item.title}, ${item.subject}, ${item.questionCount ?? 0} questions, ${item.xpReward ?? 0} XP`}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="text-foreground text-base font-semibold mb-1">
                  {item.title}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {item.subject}
                </Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${getDifficultyColor(item.difficulty)}`}
              >
                <Text className="text-xs font-medium">
                  {item.difficulty}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-border">
              <Text className="text-muted-foreground text-xs">
                {item.questionCount ?? 0} questions
              </Text>
              <View className="flex-row items-center">
                <Text className="text-amber-400 text-sm font-bold">
                  +{item.xpReward ?? 0}
                </Text>
                <Text className="text-muted-foreground text-xs ml-1">XP</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-muted-foreground text-base mb-2">
              No quizzes available
            </Text>
            <Text className="text-muted-foreground text-sm">
              Pull down to refresh
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
