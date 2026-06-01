import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { MathText } from '../../../components/MathText';
import { useLocalSearchParams, router } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { GeneratedQuiz, AIQuizQuestion } from '../../../types/models';
import { getQuizDetails, submitQuiz } from '../../../services/quizService';

/** Local quiz state derived from GeneratedQuiz. `id`, `title`, `questions` come from Firestore;
 *  `subject` and `xpReward` are derived from the quiz document where available. */
interface QuizDetail {
  id: string;
  title: string;
  subject?: string;
  questions: AIQuizQuestion[];
  xpReward?: number;
}

type ScreenState = 'loading' | 'quiz' | 'result';

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<AIQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const mathColorScheme: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getQuizDetails(id);
        setQuiz({
          id: data.id,
          title: data.title,
          subject: data.metadata?.topicsCovered?.[0] ?? '',
          questions: data.questions,
          xpReward: data.totalPoints * 2,
        });
        setQuestions(data.questions ?? []);
        setScreenState('quiz');
      } catch {
        setScreenState('quiz');
      }
    })();
  }, [id]);

  const handleSelectAnswer = useCallback(
    (questionId: string, answer: string) => {
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const handleSubmit = useCallback(async () => {
    if (!user || !quiz || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const answers = questions.map((q) => ({
        questionId: q.id,
        answer: selectedAnswers[q.id] ?? '',
      }));
      const result = await submitQuiz(quiz.id, answers, token);
      setScore(result.score);
      setXpEarned(result.xpEarned);
      setScreenState('result');
    } catch {
      setScore(0);
      setXpEarned(0);
      setScreenState('result');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, quiz, questions, selectedAnswers, isSubmitting]);

  if (screenState === 'loading') {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text className="text-muted-foreground mt-4 text-sm">Loading quiz...</Text>
      </View>
    );
  }

  if (screenState === 'result') {
    const total = questions.length;
    return (
      <View className="flex-1 bg-background p-6 pt-16 items-center justify-center">
        <View className="bg-surface rounded-3xl p-8 w-full max-w-sm items-center">
          <Text className="text-5xl mb-4">
            {score === total ? 'Perfect!' : score > total * 0.7 ? 'Great Job!' : 'Keep Learning!'}
          </Text>
          <Text variant="h2" className="text-foreground mb-2">Quiz Complete!</Text>
          <View className="flex-row items-baseline mt-4 mb-2">
            <Text className="text-4xl font-bold text-primary">{score}</Text>
            <Text className="text-xl text-muted-foreground">/{total}</Text>
          </View>
          <Text className="text-muted-foreground text-sm mb-6">
            {Math.round((score / total) * 100)}% correct
          </Text>
          {xpEarned > 0 && (
            <View className="bg-amber-500/10 rounded-xl px-6 py-3 mb-8 flex-row items-center">
              <Text className="text-amber-400 text-lg font-bold mr-1">+{xpEarned}</Text>
              <Text className="text-amber-400/80 text-sm">XP Earned</Text>
            </View>
          )}
          <Button className="w-full" onPress={() => router.back()}>
            Back to Quizzes
          </Button>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasSelectedAnswer = !!selectedAnswers[currentQuestion?.id];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <View className="flex-1 bg-background p-4 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary text-base mr-3">← Back</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text variant="h2" className="text-foreground">
            {quiz?.title ?? 'Quiz'}
          </Text>
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between mb-1">
          <Text className="text-muted-foreground text-xs">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <Text className="text-muted-foreground text-xs">
            {Math.round(progress)}%
          </Text>
        </View>
        <View className="h-2 bg-surface rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="bg-surface rounded-2xl p-5 mb-6">
          <MathText
            content={currentQuestion?.question ?? 'Loading question...'}
            colorScheme={mathColorScheme}
            className="mb-1"
          />
          {currentQuestion?.points > 0 && (
            <Text className="text-primary text-xs mt-2">
              {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View className="gap-3 mb-8">
          {currentQuestion?.options?.map((option: string, idx: number) => {
            const isSelected = selectedAnswers[currentQuestion.id] === option;
            return (
              <TouchableOpacity
                key={`${currentQuestion.id}-${idx}`}
                className={`rounded-xl p-4 border ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
                onPress={() => handleSelectAnswer(currentQuestion.id, option)}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}
                  >
                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
                  </View>
                  <MathText
                    content={option}
                    colorScheme={mathColorScheme}
                    className={`text-sm flex-1 ${isSelected ? 'text-foreground font-medium' : 'text-foreground'}`}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View className="pt-3 border-t border-border">
        {isLastQuestion ? (
          <Button
            className="w-full"
            onPress={handleSubmit}
            disabled={!hasSelectedAnswer || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button className="w-full" onPress={handleNext} disabled={!hasSelectedAnswer}>
            Next Question
          </Button>
        )}
      </View>
    </View>
  );
}
