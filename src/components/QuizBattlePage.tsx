import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  ChevronRight,
  Clock3,
  Crown,
  History,
  Loader2,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveSubjectIdsForGrade, subjects, type SubjectId } from '../data/subjects';
import {
  QuizBattleMatchSummary,
  QuizBattleMode,
  QuizBattleQueueType,
  QuizBattleSetupConfig,
  StudentBattleStats,
  StudentProfile,
} from '../types/models';
import {
  createQuizBattleBotMatch,
  createQuizBattlePrivateRoom,
  createDefaultQuizBattleSetup,
  getStudentBattleHistory,
  getStudentBattleStats,
  joinQuizBattleQueue,
  QuizBattleSetupError,
  validateQuizBattleSetup,
} from '../services/quizBattleService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';

type BattlePageTab = 'hub' | 'setup' | 'history' | 'stats' | 'leaderboard';

type LaunchState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'queued'; message: string }
  | { status: 'error'; message: string };

const cardFrameClass =
  'border border-border bg-card text-card-foreground shadow-sm dark:border-[#2b3140] dark:bg-[#181d27] dark:text-[#f5f7fb] dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]';

const formatResponseTime = (avgResponseMs: number): string => {
  if (avgResponseMs <= 0) return '--';
  return `${(avgResponseMs / 1000).toFixed(2)}s`;
};

const formatOutcomeChip = (outcome: QuizBattleMatchSummary['outcome']): string => {
  if (outcome === 'win') return 'Win';
  if (outcome === 'loss') return 'Loss';
  return 'Draw';
};

const QuizBattlePage: React.FC = () => {
  const { userProfile, userRole } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const [activeTab, setActiveTab] = useState<BattlePageTab>('hub');
  const [setupConfig, setSetupConfig] = useState<QuizBattleSetupConfig>(createDefaultQuizBattleSetup);
  const [setupErrors, setSetupErrors] = useState<QuizBattleSetupError[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [historyFilterMode, setHistoryFilterMode] = useState<'all' | QuizBattleMode>('all');

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState<StudentBattleStats | null>(null);
  const [historyData, setHistoryData] = useState<QuizBattleMatchSummary[]>([]);

  const gradeScopedSubjects = useMemo(() => {
    const allowedSubjectIds = getActiveSubjectIdsForGrade(studentProfile?.grade);
    return subjects.filter((entry) => allowedSubjectIds.includes(entry.id as SubjectId));
  }, [studentProfile?.grade]);

  const moduleOptions = useMemo(() => {
    const selectedSubject = gradeScopedSubjects.find((entry) => entry.id === setupConfig.subjectId);
    return (selectedSubject?.modules || []).map((module) => ({
      value: module.id,
      label: module.title,
    }));
  }, [gradeScopedSubjects, setupConfig.subjectId]);

  useEffect(() => {
    if (gradeScopedSubjects.length === 0) return;

    const selectedSubjectValid = gradeScopedSubjects.some((subject) => subject.id === setupConfig.subjectId);
    const nextSubjectId = selectedSubjectValid ? setupConfig.subjectId : gradeScopedSubjects[0].id;
    const selectedSubject = gradeScopedSubjects.find((subject) => subject.id === nextSubjectId);
    const firstModuleId = selectedSubject?.modules?.[0]?.id || '';

    setSetupConfig((previous) => {
      const nextTopicId =
        selectedSubject?.modules?.some((module) => module.id === previous.topicId)
          ? previous.topicId
          : firstModuleId;

      if (previous.subjectId === nextSubjectId && previous.topicId === nextTopicId) {
        return previous;
      }

      return {
        ...previous,
        subjectId: nextSubjectId,
        topicId: nextTopicId,
      };
    });
  }, [gradeScopedSubjects, setupConfig.subjectId]);

  useEffect(() => {
    if (!studentProfile?.uid) {
      setStatsData(null);
      setHistoryData([]);
      setStatsLoading(false);
      return;
    }

    let isMounted = true;
    setStatsLoading(true);

    const load = async () => {
      const [stats, history] = await Promise.all([
        getStudentBattleStats(studentProfile.uid),
        getStudentBattleHistory(studentProfile.uid, { mode: historyFilterMode, limitCount: 8 }),
      ]);

      if (!isMounted) return;
      setStatsData(stats);
      setHistoryData(history);
      setStatsLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [studentProfile?.uid, historyFilterMode]);

  const filteredHistory = useMemo(() => {
    if (historyFilterMode === 'all') return historyData;
    return historyData.filter((entry) => entry.mode === historyFilterMode);
  }, [historyData, historyFilterMode]);

  if (userRole !== 'student') {
    return (
      <div className="px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
        <Card className={cn(cardFrameClass, 'max-w-2xl')}>
          <CardHeader>
            <CardTitle>Quiz Battle is student-only</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-[#aab3c7]">
              Your account role does not have access to this module.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const setMode = (mode: QuizBattleMode) => {
    setSetupErrors([]);
    setLaunchState({ status: 'idle' });
    setSetupConfig((previous) => ({
      ...previous,
      mode,
      queueType: mode === 'online' ? previous.queueType : 'public_matchmaking',
    }));
    setActiveTab('setup');
  };

  const submitSetup = async () => {
    setLaunchState({ status: 'validating' });

    const validationErrors = validateQuizBattleSetup(setupConfig);
    if (validationErrors.length > 0) {
      setSetupErrors(validationErrors);
      setLaunchState({ status: 'error', message: 'Fix the highlighted setup fields before starting.' });
      return;
    }

    setSetupErrors([]);

    try {
      if (setupConfig.mode === 'online') {
        if (setupConfig.queueType === 'private_room') {
          const roomResult = await createQuizBattlePrivateRoom(setupConfig);
          setLaunchState({
            status: 'queued',
            message: `Private room created. Share code: ${roomResult.roomCode}`,
          });
          return;
        }

        await joinQuizBattleQueue(setupConfig);
        setLaunchState({ status: 'queued', message: 'Joined matchmaking queue. Waiting for an opponent...' });
        return;
      }

      const botMatch = await createQuizBattleBotMatch(setupConfig);
      setLaunchState({
        status: 'queued',
        message: `Bot match ${botMatch.matchId.slice(0, 8)} ready (${botMatch.botDifficulty}).`,
      });
    } catch (error) {
      const known = error as { message?: string };
      setLaunchState({
        status: 'error',
        message: known?.message || 'Unable to start battle. Please try again.',
      });
    }
  };

  const errorFor = (field: QuizBattleSetupError['field']): string | undefined => {
    return setupErrors.find((entry) => entry.field === field)?.message;
  };

  const historyWinRate = statsData?.winRate ?? 0;

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6"
      >
        <Card className={cn(cardFrameClass, 'relative overflow-hidden rounded-[20px]')}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent dark:bg-[radial-gradient(circle_at_15%_15%,rgba(140,125,255,0.28),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(121,79,255,0.17),transparent_40%)]" />
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground dark:text-[#f5f7fb]">
              <Swords className="h-5 w-5 text-primary dark:text-[#9e8fff]" />
              Quiz Battle
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-[#c4cce0]">
              Timed student duels with synchronized rounds, instant feedback, and progression rewards.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
            <div className="rounded-2xl border border-border bg-muted/50 p-3 dark:border-[#30374a] dark:bg-[#11151d]">
              <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">Win Rate</p>
              <p className="tabular-nums text-lg font-bold text-foreground dark:text-[#f5f7fb]">{historyWinRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-3 dark:border-[#30374a] dark:bg-[#11151d]">
              <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">Matches</p>
              <p className="tabular-nums text-lg font-bold text-foreground dark:text-[#f5f7fb]">{statsData?.matchesPlayed || 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-3 dark:border-[#30374a] dark:bg-[#11151d]">
              <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">Best Streak</p>
              <p className="tabular-nums text-lg font-bold text-foreground dark:text-[#f5f7fb]">{statsData?.bestStreak || 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-3 dark:border-[#30374a] dark:bg-[#11151d]">
              <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">Avg Response</p>
              <p className="tabular-nums text-lg font-bold text-foreground dark:text-[#f5f7fb]">{formatResponseTime(statsData?.averageResponseMs || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BattlePageTab)}>
          <TabsList className="w-full md:w-auto rounded-2xl p-1.5">
            <TabsTrigger value="hub" className="rounded-xl">Hub</TabsTrigger>
            <TabsTrigger value="setup" className="rounded-xl">Setup</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">History</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl">My Stats</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-xl">Leaderboard</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="hub" className="mt-5">
              <motion.div
                key="hub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMode('online')}
                    className="text-left rounded-[18px] border border-border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-accent/40 dark:border-[#333a4e] dark:bg-[#171d2a] dark:hover:border-[#8c7dff] dark:hover:bg-[#202736]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground dark:text-[#f5f7fb] font-semibold">
                        <Users className="h-4 w-4 text-primary dark:text-[#9e8fff]" />
                        1v1 Online
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-[#a2abc2]" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-[#b3bdd5]">Queue or room-code match with another student.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('bot')}
                    className="text-left rounded-[18px] border border-border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-accent/40 dark:border-[#333a4e] dark:bg-[#171d2a] dark:hover:border-[#8c7dff] dark:hover:bg-[#202736]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground dark:text-[#f5f7fb] font-semibold">
                        <Bot className="h-4 w-4 text-primary dark:text-[#9e8fff]" />
                        1v1 vs Bot
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-[#a2abc2]" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-[#b3bdd5]">Instant solo duel with selectable bot difficulty.</p>
                  </button>
                </div>

                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> Recent Matches</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground dark:text-[#a8b2c9]">No battle history yet. Start your first duel.</p>
                    ) : (
                      filteredHistory.slice(0, 5).map((entry) => (
                        <div key={entry.matchId} className="rounded-xl border border-border bg-muted/40 px-3 py-2 flex items-center justify-between dark:border-[#2f3547] dark:bg-[#11151d]">
                          <div>
                            <p className="text-sm font-semibold text-foreground dark:text-[#f5f7fb]">vs {entry.opponentName}</p>
                            <p className="text-xs text-muted-foreground dark:text-[#95a0bb]">{entry.subjectId} · {entry.difficulty}</p>
                          </div>
                          <div className="text-right">
                            <p className="tabular-nums text-sm font-semibold text-foreground dark:text-[#f5f7fb]">{entry.scoreFor} - {entry.scoreAgainst}</p>
                            <p
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                entry.outcome === 'win'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : entry.outcome === 'loss'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
                              )}
                            >
                              {formatOutcomeChip(entry.outcome)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="setup" className="mt-5">
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> Battle Setup</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                      Configure a student-safe match and start quickly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={setupConfig.mode === 'online' ? 'default' : 'outline'}
                            onClick={() => setSetupConfig((previous) => ({ ...previous, mode: 'online' }))}
                            className="h-10 rounded-xl"
                          >
                            1v1 Online
                          </Button>
                          <Button
                            type="button"
                            variant={setupConfig.mode === 'bot' ? 'default' : 'outline'}
                            onClick={() =>
                              setSetupConfig((previous) => ({
                                ...previous,
                                mode: 'bot',
                                queueType: 'public_matchmaking',
                              }))
                            }
                            className="h-10 rounded-xl"
                          >
                            1v1 vs Bot
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Category</label>
                        <Select
                          value={setupConfig.subjectId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, subjectId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('subjectId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeScopedSubjects.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id}>{entry.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('subjectId') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('subjectId')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Strand / Topic Group</label>
                        <Select
                          value={setupConfig.topicId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, topicId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('topicId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select topic group" />
                          </SelectTrigger>
                          <SelectContent>
                            {moduleOptions.map((entry) => (
                              <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('topicId') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('topicId')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Difficulty</label>
                        <Select
                          value={setupConfig.mode === 'bot' ? setupConfig.botDifficulty : setupConfig.difficulty}
                          onValueChange={(value) =>
                            setSetupConfig((previous) =>
                              previous.mode === 'bot'
                                ? { ...previous, botDifficulty: value as QuizBattleSetupConfig['botDifficulty'] }
                                : { ...previous, difficulty: value as QuizBattleSetupConfig['difficulty'] },
                            )
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            {setupConfig.mode === 'bot' && <SelectItem value="adaptive">Adaptive</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Number of Questions</label>
                        <Select
                          value={String(setupConfig.rounds)}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, rounds: Number(value) }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('rounds') && 'border-rose-400')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[3, 5, 7, 10, 12, 15].map((entry) => (
                              <SelectItem key={entry} value={String(entry)}>{entry}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('rounds') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('rounds')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Time per Question</label>
                        <Select
                          value={String(setupConfig.timePerQuestionSec)}
                          onValueChange={(value) =>
                            setSetupConfig((previous) => ({ ...previous, timePerQuestionSec: Number(value) }))
                          }
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('timePerQuestionSec') && 'border-rose-400')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[15, 20, 30, 45, 60, 90].map((entry) => (
                              <SelectItem key={entry} value={String(entry)}>{entry} sec</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('timePerQuestionSec') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('timePerQuestionSec')}</p>}
                      </div>
                    </div>

                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between rounded-xl"
                        >
                          Advanced settings
                          <ChevronRight className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-90')} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 rounded-xl border border-border bg-muted/40 p-3 space-y-3 dark:border-[#2e364a] dark:bg-[#11151d]">
                        {setupConfig.mode === 'online' ? (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Online Match Type</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'public_matchmaking' as QuizBattleQueueType, label: 'Public Queue' },
                                { value: 'private_room' as QuizBattleQueueType, label: 'Private Room' },
                              ].map((entry) => (
                                <Button
                                  key={entry.value}
                                  type="button"
                                  variant={setupConfig.queueType === entry.value ? 'default' : 'outline'}
                                  className="rounded-xl h-9"
                                  onClick={() =>
                                    setSetupConfig((previous) => ({
                                      ...previous,
                                      queueType: entry.value,
                                    }))
                                  }
                                >
                                  {entry.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 dark:border-[#2f3547] dark:bg-[#171d2a]">
                            <div>
                              <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">Adaptive Bot</p>
                              <p className="text-xs text-muted-foreground dark:text-[#a9b3ca]">Tune response timing and accuracy to your recent trend.</p>
                            </div>
                            <Switch
                              checked={setupConfig.adaptiveBot}
                              onCheckedChange={(checked) =>
                                setSetupConfig((previous) => ({
                                  ...previous,
                                  adaptiveBot: checked,
                                  botDifficulty: checked ? 'adaptive' : previous.botDifficulty === 'adaptive' ? 'medium' : previous.botDifficulty,
                                }))
                              }
                            />
                          </label>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <div aria-live="polite" className="min-h-[24px] text-sm text-muted-foreground dark:text-[#b6bfd5]">
                        {launchState.status === 'queued' && launchState.message}
                        {launchState.status === 'error' && (
                          <span className="text-destructive dark:text-rose-300">{launchState.message}</span>
                        )}
                        {launchState.status === 'validating' && (
                          <span className="inline-flex items-center gap-2 text-foreground dark:text-[#d5dcf0]"><Loader2 className="h-4 w-4 animate-spin" /> Validating setup...</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={submitSetup}
                        disabled={launchState.status === 'validating'}
                        className="rounded-xl"
                      >
                        {launchState.status === 'validating' ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Starting...</span>
                        ) : (
                          'Start battle'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="history" className="mt-5">
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base">Match History</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">Your recent student battles only.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'online', label: 'Online' },
                        { value: 'bot', label: 'Bot' },
                      ].map((entry) => (
                        <Button
                          key={entry.value}
                          type="button"
                          variant={historyFilterMode === entry.value ? 'default' : 'outline'}
                          onClick={() => setHistoryFilterMode(entry.value as 'all' | QuizBattleMode)}
                          className="rounded-xl h-8 px-3"
                        >
                          {entry.label}
                        </Button>
                      ))}
                    </div>

                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground dark:text-[#a8b2c9]">No matches in this filter yet.</p>
                    ) : (
                      filteredHistory.map((entry) => (
                        <div key={entry.matchId} className="rounded-xl border border-border bg-muted/40 px-3 py-2 flex items-center justify-between gap-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                          <div>
                            <p className="text-sm font-semibold text-foreground dark:text-[#f5f7fb]">vs {entry.opponentName}</p>
                            <p className="text-xs text-muted-foreground dark:text-[#95a0bb] tabular-nums">{entry.scoreFor}-{entry.scoreAgainst} · {entry.accuracy.toFixed(0)}% · +{entry.xpEarned} XP</p>
                          </div>
                          <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 border', entry.outcome === 'win' ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-300/40 dark:bg-emerald-900/20' : entry.outcome === 'loss' ? 'text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-300/40 dark:bg-rose-900/20' : 'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-300/40 dark:bg-amber-900/20')}>
                            {formatOutcomeChip(entry.outcome)}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="stats" className="mt-5">
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                {[
                  {
                    label: 'Wins',
                    value: statsData?.wins ?? 0,
                    icon: Trophy,
                  },
                  {
                    label: 'Current streak',
                    value: statsData?.currentStreak ?? 0,
                    icon: Sparkles,
                  },
                  {
                    label: 'Avg accuracy',
                    value: `${(statsData?.averageAccuracy || 0).toFixed(1)}%`,
                    icon: ShieldCheck,
                  },
                  {
                    label: 'Avg response',
                    value: formatResponseTime(statsData?.averageResponseMs || 0),
                    icon: Clock3,
                  },
                ].map((entry) => (
                  <Card key={entry.label} className={cn(cardFrameClass, 'rounded-[18px]')}>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">{entry.label}</p>
                      <p className="mt-1 tabular-nums text-2xl font-black text-foreground dark:text-[#f5f7fb]">{entry.value}</p>
                      <entry.icon className="mt-3 h-4 w-4 text-primary dark:text-[#9e8fff]" />
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-5">
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> Student Leaderboard</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                      Privacy-safe rank view is coming in the next implementation slice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground dark:text-[#a9b3ca]">This section will surface student-only ranking cards with alias display controls.</p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default QuizBattlePage;
