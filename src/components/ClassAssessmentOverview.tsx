import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { AlertTriangle, TrendingUp, Users, Target, BookOpen } from 'lucide-react';
import { getClassAssessmentSummary } from '../services/assessmentService';
import type { ClassAssessmentSummary } from '../types/assessment';

interface ClassAssessmentOverviewProps {
  classId: string;
  teacherUid: string;
}

const ClassAssessmentOverview: React.FC<ClassAssessmentOverviewProps> = ({ classId, teacherUid }) => {
  const [summary, setSummary] = useState<ClassAssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClassAssessmentSummary(classId, teacherUid)
      .then((data) => {
        setSummary(data);
      })
      .catch((err) => {
        console.error('Failed to load class assessment summary:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [classId, teacherUid]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No assessment data available for this class yet.
        </CardContent>
      </Card>
    );
  }

  const completionRate = summary.totalStudents > 0 
    ? Math.round((summary.completedAssessments / summary.totalStudents) * 100) 
    : 0;

  const interventionRate = summary.totalStudents > 0
    ? Math.round((summary.studentsNeedingIntervention.length / summary.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">{summary.averageScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Need Intervention</p>
                <p className="text-2xl font-bold">{summary.studentsNeedingIntervention.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <Progress value={interventionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assessed</p>
                <p className="text-2xl font-bold">{summary.completedAssessments}/{summary.totalStudents}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(summary.competencyAverages).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Competency Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.competencyAverages).map(([competency, score]) => (
                <div key={competency} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{competency.replace(/-/g, ' ')}</span>
                  <div className="flex items-center gap-2 w-1/2">
                    <Progress value={score as number} className="flex-1" />
                    <span className="text-sm font-medium w-10 text-right">{score as number}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassAssessmentOverview;