import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface SubjectGrade {
  subject: string;
  prelim: number;
  midterm: number;
  final: number;
  finalGrade: number;
  status: 'passing' | 'at_risk' | 'failing';
}

const GRADES: SubjectGrade[] = [
  { subject: 'Pre-Calculus', prelim: 88, midterm: 91, final: 93, finalGrade: 91, status: 'passing' },
  { subject: 'Business Math', prelim: 82, midterm: 85, final: 88, finalGrade: 85, status: 'passing' },
  { subject: 'Logic & Critical Thinking', prelim: 78, midterm: 74, final: 71, finalGrade: 74, status: 'at_risk' },
];

const STATUS_VARIANT = {
  passing: 'success',
  at_risk: 'warning',
  failing: 'destructive',
} as const;

const STATUS_LABEL = {
  passing: '✓ On Track',
  at_risk: '⚠ At Risk',
  failing: '✗ Failing',
} as const;

export default function GradesScreen() {
  const gwa = (GRADES.reduce((sum, g) => sum + g.finalGrade, 0) / GRADES.length).toFixed(2);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pt-8 pb-4">
        <Text variant="h1" className="text-foreground">Grade Report</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Q3 · School Year 2025-2026
        </Text>
      </View>

      {/* GWA hero */}
      <View className="px-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/30">
          <Text className="text-indigo-300 text-xs uppercase tracking-wide">General Weighted Average</Text>
          <Text className="text-foreground text-5xl font-bold mt-2">{gwa}</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {parseFloat(gwa) >= 90 ? 'With Highest Honors 🏆' :
             parseFloat(gwa) >= 85 ? 'With High Honors 🌟' :
             parseFloat(gwa) >= 80 ? 'Honors' : '—'}
          </Text>
        </Card>
      </View>

      {/* Subject grades */}
      <View className="px-4 mb-4">
        <Text variant="h3" className="text-foreground mb-3">Subject Breakdown</Text>
        <View className="gap-3">
          {GRADES.map((g) => (
            <Card key={g.subject} className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-foreground text-base font-semibold flex-1">{g.subject}</Text>
                <Badge variant={STATUS_VARIANT[g.status]}>{STATUS_LABEL[g.status]}</Badge>
              </View>
              <View className="flex-row justify-between mb-2">
                <GradeCell label="Prelim" value={g.prelim} />
                <GradeCell label="Midterm" value={g.midterm} />
                <GradeCell label="Final" value={g.final} />
              </View>
              <View className="pt-3 border-t border-border flex-row justify-between items-center">
                <Text className="text-muted-foreground text-xs">Final Grade</Text>
                <Text className={`text-lg font-bold ${
                  g.finalGrade >= 85 ? 'text-emerald-400' :
                  g.finalGrade >= 75 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {g.finalGrade}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </View>

      <View className="px-4">
        <Card className="p-4 bg-amber-500/10 border border-amber-500/30">
          <Text className="text-amber-300 text-sm font-semibold mb-1">💡 Improvement tip</Text>
          <Text className="text-muted-foreground text-xs">
            Your Logic grade dropped 4 points from prelim to final. Consider scheduling a 1-on-1 session with your teacher or revisiting the propositional logic module.
          </Text>
        </Card>
      </View>
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
