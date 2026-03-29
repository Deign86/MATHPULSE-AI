import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Award, Target, Calendar, Download, Filter, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { UserProgress, type StudentProfile } from '../types/models';
import { SHS_MATH_SUBJECTS, getActiveSubjectIdsForGrade, type SubjectId } from '../data/subjects';

const GradesPage = () => {
  const { currentUser, userProfile } = useAuth();
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const allowedSubjectSet = new Set(allowedSubjectIds);

  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await getUserProgress(currentUser.uid);
        setProgress(data);
      } catch (err) {
        console.error('Error loading grades:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, [currentUser]);

  // Compute stats from Firebase progress data
  const quizAttempts = progress?.quizAttempts || [];
  const totalQuizzes = progress?.totalQuizzesCompleted || 0;
  const averageScore = progress?.averageScore || 0;
  const gpa = averageScore > 0 ? Math.min((averageScore / 25), 4.0).toFixed(2) : '0.00';

  // Derive subject performance from progress data
  const colorBySubjectId: Record<SubjectId, string> = {
    'gen-math': 'blue',
    'stats-prob': 'cyan',
    'pre-calc': 'teal',
    'basic-calc': 'orange',
  };

  const subjectMap: Record<string, { label: string; color: string }> = SHS_MATH_SUBJECTS.reduce((acc, subject) => {
    acc[subject.id] = {
      label: subject.name,
      color: colorBySubjectId[subject.id as SubjectId] || 'slate',
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  const allowedSubjectLabels = SHS_MATH_SUBJECTS
    .filter((subject) => allowedSubjectSet.has(subject.id as SubjectId))
    .map((subject) => subject.name);

  const subjectPerformance = Object.entries(progress?.subjects || {})
    .filter(([subjectId]) => allowedSubjectSet.has(subjectId as SubjectId))
    .map(([subjectId, subjectData]) => {
    const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
    const subjectQuizzes = quizAttempts.filter(q => q.quizId?.startsWith(subjectId));
    const avg = subjectQuizzes.length > 0
      ? Math.round(subjectQuizzes.reduce((sum, q) => sum + q.score, 0) / subjectQuizzes.length)
      : Math.round(subjectData.progress);
    return {
      subject: info.label,
      average: avg,
      quizzes: subjectQuizzes.length || subjectData.completedModules,
      color: info.color,
      trend: 'up' as const,
    };
  });

  // If no Firebase progress subjects, show default subjects with zero data
  const defaultSubjectPerformance = allowedSubjectIds.map((subjectId) => {
    const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
    return {
      subject: info.label,
      average: 0,
      quizzes: 0,
      color: info.color,
      trend: 'up' as const,
    };
  });

  const displaySubjectPerformance = subjectPerformance.length > 0 ? subjectPerformance : defaultSubjectPerformance;

  // Recent quizzes from quiz attempts
  const recentQuizzes = quizAttempts
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10)
    .map((attempt, i) => ({
      id: i + 1,
      title: attempt.quizId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Quiz ${i + 1}`,
      subject: Object.entries(subjectMap).find(([key]) => attempt.quizId?.startsWith(key))?.[1]?.label || 'General',
      score: attempt.score,
      total: 100,
      date: attempt.completedAt instanceof Date
        ? attempt.completedAt.toISOString().split('T')[0]
        : new Date(attempt.completedAt).toISOString().split('T')[0],
      type: attempt.quizId?.includes('practice') ? 'practice' as const : 'module' as const,
      status: attempt.score >= 60 ? 'passed' : 'failed',
    }))
    .filter((quiz) => allowedSubjectLabels.includes(quiz.subject));

  const overallStats = {
    gpa: parseFloat(gpa),
    totalQuizzes,
    averageScore,
    trend: 'up',
    trendValue: 0,
  };

  const filteredQuizzes = recentQuizzes.filter(quiz => {
    if (!allowedSubjectLabels.includes(quiz.subject)) return false;
    const subjectMatch = filterSubject === 'all' || quiz.subject === filterSubject;
    const typeMatch = filterType === 'all' || quiz.type === filterType;
    return subjectMatch && typeMatch;
  });

  useEffect(() => {
    if (filterSubject === 'all') return;
    if (!allowedSubjectLabels.includes(filterSubject)) {
      setFilterSubject('all');
    }
  }, [allowedSubjectLabels, filterSubject]);

  const handleExportReport = () => {
    // Generate CSV export
    const headers = ['Quiz', 'Subject', 'Type', 'Score', 'Date', 'Status'];
    const rows = recentQuizzes.map(q => [q.title, q.subject, q.type, `${q.score}%`, q.date, q.status]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathpulse-grades-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50';
    if (score >= 80) return 'text-sky-600 bg-sky-50';
    if (score >= 70) return 'text-rose-600 bg-rose-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeLetter = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-white via-sky-50/30 to-white rounded-2xl p-7 card-elevated-lg relative overflow-hidden border border-slate-200/80">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-100/40 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award size={18} className="text-rose-500" />
              <span className="text-xs text-slate-500 font-body">Overall GPA</span>
            </div>
            <p className="text-3xl font-display font-bold text-[#0a1628]">{overallStats.gpa}</p>
            <div className="flex items-center gap-1 mt-2">
              {overallStats.trend === 'up' ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span className="text-xs text-slate-500 font-body">+{overallStats.trendValue}% this month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-sky-500" />
              <span className="text-xs text-slate-500 font-body">Average Score</span>
            </div>
            <p className="text-3xl font-display font-bold text-[#0a1628]">{overallStats.averageScore}%</p>
            <p className="text-xs text-slate-500 font-body mt-2">Across all subjects</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-rose-500" />
              <span className="text-xs text-slate-500 font-body">Total Quizzes</span>
            </div>
            <p className="text-3xl font-display font-bold text-[#0a1628]">{overallStats.totalQuizzes}</p>
            <p className="text-xs text-slate-500 font-body mt-2">Completed</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award size={18} className="text-rose-500" />
              <span className="text-xs text-slate-500 font-body">Grade Rank</span>
            </div>
            <p className="text-3xl font-display font-bold text-[#0a1628]">Top 15%</p>
            <p className="text-xs text-slate-500 font-body mt-2">In your class</p>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-[#0a1628]">Subject Performance</h2>
          <Button variant="outline" size="sm" className="rounded-lg font-body border-[#dde3eb] text-[#5a6578]" onClick={handleExportReport}>
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {displaySubjectPerformance.map((subject) => (
            <motion.div
              key={subject.subject}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl p-5 border border-[#dde3eb] card-elevated cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[#0a1628] mb-1">{subject.subject}</h3>
                  <p className="text-xs text-[#5a6578] font-body">{subject.quizzes} quizzes completed</p>
                </div>
                <div className={`w-14 h-14 rounded-lg bg-${subject.color}-50 flex items-center justify-center`}>
                  <span className={`text-xl font-display font-bold text-${subject.color}-600`}>
                    {getGradeLetter(subject.average)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-display font-bold text-[#0a1628]">{subject.average}%</p>
                  <p className="text-xs text-[#5a6578] font-body mt-1">Average</p>
                </div>
                <div className="flex items-center gap-1">
                  {subject.trend === 'up' ? (
                    <TrendingUp size={18} className="text-green-500" />
                  ) : (
                    <TrendingDown size={18} className="text-red-500" />
                  )}
                  <ChevronRight size={16} className="text-[#d1cec6]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quiz History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-[#0a1628]">Quiz History</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm font-body bg-white text-[#0a1628]"
            >
              <option value="all">All Subjects</option>
              {allowedSubjectLabels.map((subjectName) => (
                <option key={subjectName} value={subjectName}>{subjectName}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-[#dde3eb] rounded-lg text-sm font-body bg-white text-[#0a1628]"
            >
              <option value="all">All Types</option>
              <option value="practice">Practice</option>
              <option value="module">Module</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#dde3eb] card-elevated overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f7f9fc] border-b border-[#dde3eb]">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Quiz</th>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-[10px] font-body font-semibold text-[#5a6578] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-[#edf1f7] hover:bg-[#f7f9fc] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-body font-semibold text-[#0a1628] text-sm">{quiz.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#5a6578] font-body">{quiz.subject}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-[#edf1f7] text-[#5a6578] text-xs font-body font-semibold rounded-md capitalize">
                      {quiz.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-sm font-body font-semibold ${getGradeColor(quiz.score)}`}>
                        {quiz.score}%
                      </span>
                      <span className="text-xs text-slate-500 font-body">({quiz.score}/{quiz.total})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#5a6578] font-body">{quiz.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="outline" size="sm" className="rounded-lg">
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredQuizzes.length === 0 && (
            <div className="text-center py-12">
              <Filter size={40} className="text-[#d1cec6] mx-auto mb-3" />
              <p className="text-[#5a6578] font-body">No quizzes found with current filters</p>
              <p className="text-xs text-slate-500 font-body mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradesPage;