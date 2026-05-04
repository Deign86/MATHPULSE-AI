import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Activity, BookOpen } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PlatformAnalyticsData {
  totalStudents: number;
  completedAssessments: number;
  completionRate: number;
  averageScore: number;
  topWeaknesses: Array<{ competency: string; count: number }>;
  topStrengths: Array<{ competency: string; count: number }>;
  recentAssessments: number;
}

const AdminAssessmentAnalytics: React.FC = () => {
  const [data, setData] = useState<PlatformAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // Query competency profiles for platform-wide analytics
        const profilesQuery = query(collection(db, 'competencyProfiles'));
        const profilesSnap = await getDocs(profilesQuery);

        let totalStudents = 0;
        let completedAssessments = 0;
        let totalScore = 0;
        const weaknessCounts: Record<string, number> = {};
        const strengthCounts: Record<string, number> = {};

        profilesSnap.forEach((doc) => {
          const profile = doc.data();
          totalStudents++;
          
          if (profile.overallScore > 0) {
            completedAssessments++;
            totalScore += profile.overallScore;
          }

          if (profile.competencies) {
            Object.entries(profile.competencies).forEach(([compId, compData]: [string, any]) => {
              if (compData.score < 50) {
                weaknessCounts[compId] = (weaknessCounts[compId] || 0) + 1;
              } else if (compData.score >= 80) {
                strengthCounts[compId] = (strengthCounts[compId] || 0) + 1;
              }
            });
          }
        });

        const topWeaknesses = Object.entries(weaknessCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([competency, count]) => ({ competency, count }));

        const topStrengths = Object.entries(strengthCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([competency, count]) => ({ competency, count }));

        setData({
          totalStudents,
          completedAssessments,
          completionRate: totalStudents > 0 ? Math.round((completedAssessments / totalStudents) * 100) : 0,
          averageScore: completedAssessments > 0 ? Math.round(totalScore / completedAssessments) : 0,
          topWeaknesses,
          topStrengths,
          recentAssessments: completedAssessments,
        });
      } catch (err) {
        console.error('Failed to load platform analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No analytics data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{data.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold">{data.completionRate}%</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">{data.averageScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assessed</p>
                <p className="text-2xl font-bold">{data.completedAssessments}</p>
              </div>
              <BookOpen className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Top Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topWeaknesses.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topWeaknesses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="competency" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No weakness data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topStrengths.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topStrengths}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="competency" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No strength data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAssessmentAnalytics;