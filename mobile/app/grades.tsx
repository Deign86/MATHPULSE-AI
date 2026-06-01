import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/useAuthStore';
import {
  getStudentGrades,
  getAvailableSchoolYears,
  type QuarterlyGrade,
} from '../services/gradesService';

const STATUS_VARIANT = {
  passing: 'success',
  at_risk: 'warning',
  failing: 'destructive',
} as const;

const STATUS_LABEL: Record<keyof typeof STATUS_VARIANT, string> = {
  passing: 'On Track',
  at_risk: 'At Risk',
  failing: 'Failing',
};

function getStatus(final: number): keyof typeof STATUS_VARIANT {
  if (final >= 85) return 'passing';
  if (final >= 75) return 'at_risk';
  return 'failing';
}

function getHonorLabel(gwa: number): string {
  if (gwa >= 90) return 'With Highest Honors';
  if (gwa >= 85) return 'With High Honors';
  if (gwa >= 80) return 'Honors';
  return '';
}

export default function GradesScreen() {
  const user = useAuthStore((s) => s.user);
  const studentProfile = useAuthStore((s) => s.studentProfile);
  const [grades, setGrades] = useState<QuarterlyGrade[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const defaultYear =
    String(studentProfile?.schoolYear ?? '') || getDefaultSchoolYear();

  const gwa =
    grades.length > 0
      ? (grades.reduce((sum, g) => sum + g.final, 0) / grades.length).toFixed(2)
      : '0.00';

  const loadGrades = useCallback(
    async (year: string) => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getStudentGrades(user.uid, year);
        setGrades(data);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const onRefresh = useCallback(async () => {
    if (!user || !selectedYear) return;
    setRefreshing(true);
    await loadGrades(selectedYear);
    setRefreshing(false);
  }, [user, selectedYear, loadGrades]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const available = await getAvailableSchoolYears(user.uid);
      if (cancelled) return;
      setYears(available);
      const year = available.includes(defaultYear) ? defaultYear : available[0] ?? defaultYear;
      setSelectedYear(year);
      await loadGrades(year);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, defaultYear, loadGrades]);

  useEffect(() => {
    if (selectedYear) {
      loadGrades(selectedYear);
    }
  }, [selectedYear, loadGrades]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text variant="h3" className="text-foreground text-center">
          Please sign in to view your grades.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />
      }
    >
      {/* Header */}
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Grade Report</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          School Year {selectedYear ?? defaultYear}
        </Text>
      </View>

      {/* School Year Selector */}
      {years.length > 0 && (
        <View className="px-4 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* GWA hero */}
      <View className="px-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/30">
          <Text className="text-indigo-300 text-xs uppercase tracking-wide">General Weighted Average</Text>
          <Text className="text-foreground text-5xl font-bold mt-2">{gwa}</Text>
          {parseFloat(gwa) >= 80 && (
            <Text className="text-muted-foreground text-sm mt-1">{getHonorLabel(parseFloat(gwa))}</Text>
          )}
        </Card>
      </View>

      {/* Loading state */}
      {loading && (
        <View className="px-4 mb-4 items-center">
          <ActivityIndicator size="large" color="#a78bfa" />
          <Text className="text-muted-foreground text-sm mt-2">Loading grades...</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && grades.length === 0 && (
        <View className="px-4 mb-4">
          <Card className="p-6 items-center">
            <Text className="text-muted-foreground text-sm text-center">
              No grades found for {selectedYear ?? defaultYear}. Grades will appear here once your teacher posts them.
            </Text>
          </Card>
        </View>
      )}

      {/* Subject grades */}
      {!loading && grades.length > 0 && (
        <View className="px-4 mb-4">
          <Text variant="h3" className="text-foreground mb-3">Subject Breakdown</Text>
          <View className="gap-3">
            {grades.map((g) => {
              const status = getStatus(g.final);
              return (
                <Card key={g.id} className="p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-foreground text-base font-semibold flex-1">{g.subject}</Text>
                    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <GradeCell label="Q1" value={g.q1} />
                    <GradeCell label="Q2" value={g.q2} />
                    <GradeCell label="Q3" value={g.q3} />
                    <GradeCell label="Q4" value={g.q4} />
                  </View>

                  {g.remarks.length > 0 && (
                    <View className="mb-2">
                      <Text className="text-muted-foreground text-xs italic">{g.remarks}</Text>
                    </View>
                  )}

                  <View className="pt-3 border-t border-border flex-row justify-between items-center">
                    <Text className="text-muted-foreground text-xs">Final Grade</Text>
                    <Text
                      className={`text-lg font-bold ${
                        g.final >= 85 ? 'text-emerald-400' : g.final >= 75 ? 'text-amber-400' : 'text-red-400'
                      }`}
                    >
                      {g.final}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function GradeCell({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</Text>
      <Text className="text-foreground text-lg font-bold mt-0.5">{value}</Text>
    </View>
  );
}

function getDefaultSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month >= 5) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
