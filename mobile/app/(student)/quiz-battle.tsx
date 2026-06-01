import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  useQuizBattleStore,
  TOPICS,
  type Topic,
  type MatchState,
} from '../../stores/useQuizBattleStore';

const TIMER_SECONDS = 30;

export default function QuizBattleScreen() {
  const router = useRouter();
  const { user, studentProfile } = useAuthStore();
  const {
    matchState,
    opponent,
    questions,
    currentQuestionIndex,
    selectedTopic,
    selectedGradeLevel,
    answers,
    result,
    error,
    setTopic,
    setGradeLevel,
    startMatch,
    cancelMatch,
    selectAnswer,
    submitAnswer,
    endBattle,
    reset,
  } = useQuizBattleStore();

  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.uid ?? '';
  const userName = studentProfile?.name ?? user?.name ?? 'Student';

  // ── Timer management ───────────────────────────────────────────────
  useEffect(() => {
    if (matchState === 'in-battle') {
      setTimer(TIMER_SECONDS);
      setSelectedOption(null);
    }
  }, [matchState, currentQuestionIndex]);

  useEffect(() => {
    if (matchState !== 'in-battle' || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setTimer((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [matchState, currentQuestionIndex, isSubmitting]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (timer === 0 && matchState === 'in-battle' && !isSubmitting) {
      handleSubmitAnswer();
    }
  }, [timer]);

  // ── Countdown for matched state ────────────────────────────────────
  useEffect(() => {
    if (matchState !== 'matched') return;

    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [matchState]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleStartMatch = useCallback(() => {
    if (!userId) return;
    startMatch(userId, userName);
  }, [userId, userName, startMatch]);

  const handleCancelMatch = useCallback(() => {
    if (!userId) return;
    cancelMatch(userId);
  }, [userId, cancelMatch]);

  const handleSelectOption = useCallback(
    (index: number) => {
      setSelectedOption(index);
      selectAnswer(index);
    },
    [selectAnswer],
  );

  const handleSubmitAnswer = useCallback(async () => {
    if (isSubmitting || !userId) return;
    setIsSubmitting(true);

    try {
      await submitAnswer(userId);
    } catch {
      // handled by store
    }

    setIsSubmitting(false);
  }, [isSubmitting, userId, submitAnswer]);

  const handleEndBattle = useCallback(async () => {
    if (!userId) return;
    await endBattle(userId);
  }, [userId, endBattle]);

  const handlePlayAgain = useCallback(() => {
    reset();
  }, [reset]);

  const handleGoBack = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  // ── Derived state ──────────────────────────────────────────────────
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestionIndex);
  const progress = questions.length > 0
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  // ── Idle / Topic Picker ────────────────────────────────────────────
  if (matchState === 'idle') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          <Text variant="h1" className="mb-1">
            Quiz Battle
          </Text>
          <Text variant="body" className="text-muted-foreground mb-6">
            Challenge another student in real-time math battles
          </Text>

          {error ? (
            <View className="bg-error/10 border border-error/30 rounded-lg p-4 mb-4">
              <Text variant="body-small" className="text-error">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Topic Selection */}
          <Text variant="label" className="mb-2">
            Choose Topic
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {TOPICS.map((topic: Topic) => (
              <Pressable
                key={topic}
                onPress={() => setTopic(topic)}
                className={`px-4 py-2 rounded-full border ${
                  selectedTopic === topic
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Select ${topic} topic`}
                accessibilityState={{ selected: selectedTopic === topic }}
              >
                <Text
                  variant="body-small"
                  className={selectedTopic === topic ? 'text-primary-foreground' : 'text-surface-foreground'}
                >
                  {topic}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Grade Level Picker */}
          <Text variant="label" className="mb-2">
            Grade Level
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {[11, 12].map((grade: number) => (
              <Pressable
                key={grade}
                onPress={() => setGradeLevel(grade)}
                className={`px-4 py-2 rounded-full border ${
                  selectedGradeLevel === grade
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Grade ${grade}`}
                accessibilityState={{ selected: selectedGradeLevel === grade }}
              >
                <Text
                  variant="body-small"
                  className={
                    selectedGradeLevel === grade ? 'text-primary-foreground' : 'text-surface-foreground'
                  }
                >
                  Grade {grade}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button onPress={handleStartMatch} size="lg" className="w-full" accessibilityLabel="Find match">
            Find Match
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Searching ──────────────────────────────────────────────────────
  if (matchState === 'searching') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#6366f1" className="mb-4" />
          <Text variant="h3" className="mb-2 text-center">
            Searching for opponent...
          </Text>
          <Text variant="body" className="text-muted-foreground text-center mb-6">
            Topic: {selectedTopic} | Grade {selectedGradeLevel}
          </Text>

          {opponent ? (
            <Text variant="body-small" className="text-primary mb-4">
              Match found! Starting battle...
            </Text>
          ) : (
            <Text variant="body-small" className="text-muted-foreground mb-6">
              Waiting for another student to join...
            </Text>
          )}

          <Button
            variant="outline"
            onPress={handleCancelMatch}
            accessibilityLabel="Cancel matchmaking"
          >
            Cancel
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ── Matched / Countdown ────────────────────────────────────────────
  if (matchState === 'matched') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-8">
          <Text variant="h2" className="mb-4 text-center">
            Match Found!
          </Text>

          <View className="flex-row items-center justify-center mb-4">
            <View className="bg-surface rounded-lg p-4 mx-2 items-center min-w-[100]">
              <Text variant="h4">{userName}</Text>
              <Text variant="caption" className="text-primary">
                You
              </Text>
            </View>
            <Text variant="h2" className="mx-2 text-muted-foreground">
              VS
            </Text>
            <View className="bg-surface rounded-lg p-4 mx-2 items-center min-w-[100]">
              <Text variant="h4">{opponent?.userName ?? 'Opponent'}</Text>
              <Text variant="caption" className="text-muted-foreground">
                Opponent
              </Text>
            </View>
          </View>

          <Text variant="body" className="text-muted-foreground mb-6">
            Topic: {selectedTopic} | Grade {selectedGradeLevel}
          </Text>

          <Text variant="h1" className="text-primary mb-4">
            {countdown > 0 ? countdown : 'GO!'}
          </Text>
          <Text variant="body-small" className="text-muted-foreground">
            Battle starting...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── In Battle ──────────────────────────────────────────────────────
  if (matchState === 'in-battle' && currentQuestion) {
    const options = currentQuestion.options ?? [];
    const timerPercent = (timer / TIMER_SECONDS) * 100;

    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-2">
            <Text variant="caption">
              Question {currentQuestionIndex + 1}/{questions.length}
            </Text>
            <Text
              variant="caption"
              className={timer <= 5 ? 'text-error' : 'text-surface-foreground'}
            >
              {timer}s
            </Text>
          </View>

          {/* Timer bar */}
          <View className="w-full h-2 bg-surface rounded-full mb-4 overflow-hidden">
            <View
              className={`h-full rounded-full ${
                timerPercent > 50 ? 'bg-primary' : timerPercent > 25 ? 'bg-amber-500' : 'bg-error'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </View>

          {/* Progress dots */}
          <View className="flex-row justify-center gap-1 mb-4">
            {questions.map((_, idx: number) => (
              <View
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx < currentQuestionIndex
                    ? 'bg-primary'
                    : idx === currentQuestionIndex
                      ? 'bg-primary'
                      : 'bg-surface'
                }`}
              />
            ))}
          </View>

          {/* Question */}
          <Card className="mb-4">
            <CardContent>
              <Text variant="h4" className="mb-4">
                {currentQuestion.question}
              </Text>
              <Text variant="caption" className="text-muted-foreground mb-2">
                Select your answer:
              </Text>
            </CardContent>
          </Card>

          {/* Options */}
          <View className="gap-2 mb-4">
            {options.map((option: string, idx: number) => {
              const isSelected = selectedOption === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectOption(idx)}
                  className={`p-4 rounded-lg border ${
                    isSelected
                      ? 'bg-primary/20 border-primary'
                      : 'bg-surface border-border active:bg-surface/70'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`Option ${String.fromCharCode(65 + idx)}: ${option}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    variant="body"
                    className={isSelected ? 'text-primary' : 'text-surface-foreground'}
                  >
                    <Text
                      variant="body"
                      className={isSelected ? 'text-primary font-bold' : 'text-muted-foreground font-bold'}
                    >
                      {String.fromCharCode(65 + idx)}.{' '}
                    </Text>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Submit / Next */}
          <Button
            onPress={handleSubmitAnswer}
            loading={isSubmitting}
            size="lg"
            className="w-full"
            accessibilityLabel={
              currentQuestionIndex < questions.length - 1 ? 'Submit and next question' : 'Finish battle'
            }
          >
            {currentQuestionIndex < questions.length - 1 ? 'Submit & Next' : 'Finish'}
          </Button>

          {/* Forfeit */}
          <Button
            variant="ghost"
            onPress={handleEndBattle}
            className="mt-2 w-full"
            textClassName="text-muted-foreground"
            accessibilityLabel="Forfeit battle"
          >
            Forfeit
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Complete ───────────────────────────────────────────────────────
  if (matchState === 'complete') {
    const playerScore = result?.playerScore ?? 0;
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((playerScore / totalQuestions) * 100) : 0;
    const outcome = result?.outcome ?? 'draw';

    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, alignItems: 'center' }}>
          <Text variant="h2" className="mb-6 text-center">
            Battle Complete!
          </Text>

          {/* Result card */}
          <Card className="w-full mb-4">
            <CardContent>
              <Text
                variant="h3"
                className={`text-center mb-4 ${
                  outcome === 'win'
                    ? 'text-emerald-400'
                    : outcome === 'loss'
                      ? 'text-error'
                      : 'text-amber-400'
                }`}
              >
                {outcome === 'win' ? 'You Won!' : outcome === 'loss' ? 'You Lost' : "It's a Draw!"}
              </Text>

              <View className="flex-row justify-around mb-4">
                <View className="items-center">
                  <Text variant="caption" className="text-muted-foreground">
                    You
                  </Text>
                  <Text variant="h3">{playerScore}/{totalQuestions}</Text>
                  <Text variant="caption" className="text-primary">
                    {percentage}%
                  </Text>
                </View>
                <View className="items-center">
                  <Text variant="caption" className="text-muted-foreground">
                    {opponent?.userName ?? 'Opponent'}
                  </Text>
                  <Text variant="h3">{result?.opponentScore ?? '-'}/{totalQuestions}</Text>
                </View>
              </View>

              <Text variant="body-small" className="text-muted-foreground text-center">
                Topic: {selectedTopic} | Grade {selectedGradeLevel}
              </Text>
            </CardContent>
          </Card>

          <Button onPress={handlePlayAgain} size="lg" className="w-full mb-2" accessibilityLabel="Play again">
            Play Again
          </Button>

          <Button
            variant="outline"
            onPress={handleGoBack}
            className="w-full"
            accessibilityLabel="Back to home"
          >
            Back to Home
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Fallback ──────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    </SafeAreaView>
  );
}
