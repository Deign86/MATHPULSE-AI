import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, Calendar, Download, Filter } from 'lucide-react';
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

  // Safely cast userProfile to StudentProfile to access grade
  const studentGrade = (userProfile as StudentProfile | null)?.grade;
  
  // Get active subjects for the user's grade
  const allowedSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const allowedSubjectSet = new Set(allowedSubjectIds);

  const formatDateOnly = (value: Date | string | number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await getUserProgress(currentUser.uid);
        setProgress(data);
      } catch (err) {
        console.error("Failed to load progress for grades:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [currentUser]);

  // Compute stats safely
  const quizAttempts = progress?.quizAttempts || [];
  const totalQuizzes = progress?.totalQuizzesCompleted || 0;
  const averageScore = progress?.averageScore || 0;
  
  // Calculate GPA approximation (assuming 0-100 scale mapping to 0.0-4.0)
  const gpa = averageScore > 0 ? Math.min((averageScore / 25), 4.0).toFixed(2) : '0.00';

  const colorBySubjectId: Record<SubjectId, string> = {
    'gen-math': 'indigo',
    'stats-prob': 'violet',
    'pre-calc': 'fuchsia',
    'basic-calc': 'purple',
  };
  const colorClassBySubject: Record<string, { dot: string; bar: string }> = {
    indigo: { dot: 'bg-indigo-500', bar: 'bg-indigo-500' },
    violet: { dot: 'bg-violet-500', bar: 'bg-violet-500' },
    fuchsia: { dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500' },
    purple: { dot: 'bg-purple-500', bar: 'bg-purple-500' },
    slate: { dot: 'bg-slate-500', bar: 'bg-slate-500' },
  };

  const subjectMap: Record<string, { label: string; color: string }> = SHS_MATH_SUBJECTS.reduce((acc, subject) => {
    acc[subject.id] = {
      label: subject.name,
      color: colorBySubjectId[subject.id as SubjectId] || 'slate'
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  // Calculate subject performance, but only include allowed subjects
  const allowedSubjectLabels: string[] = SHS_MATH_SUBJECTS
    .filter((subject) => allowedSubjectSet.has(subject.id as SubjectId))
    .map((subject) => subject.name);

  // Compute subject metrics
  const subjectPerformance = Object.entries(progress?.subjects || {})
    .filter(([subjectId]) => allowedSubjectSet.has(subjectId as SubjectId))
    .map(([subjectId, subjectData]) => {
      const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
      
      const subjectQuizzes = quizAttempts.filter(q => q.quizId?.startsWith(subjectId));
      const avg = subjectQuizzes.length > 0
        ? Math.round(subjectQuizzes.reduce((sum, q) => sum + q.score, 0) / subjectQuizzes.length)
        : Math.round(subjectData.progress); // Fallback to progress %
        
      return {
        subject: info.label,
        average: avg,
        quizzes: subjectQuizzes.length || subjectData.completedModules,
        color: info.color
      };
    });

  // Default empty state for all allowed subjects if no progress
  const defaultSubjectPerformance = allowedSubjectIds.map((subjectId) => {
    const info = subjectMap[subjectId] || { label: subjectId, color: 'slate' };
    return {
      subject: info.label,
      average: 0,
      quizzes: 0,
      color: info.color
    };
  });

  const displaySubjectPerformance = subjectPerformance.length > 0 ? subjectPerformance : defaultSubjectPerformance;

  // Recent Quizzes mapping
  const recentQuizzes = quizAttempts
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10).map((attempt, i) => {
      // Find the subject from the ID
      const subjectEntry = Object.entries(subjectMap).find(([key]) => attempt.quizId?.startsWith(key));
      const subjectLabel = subjectEntry?.[1]?.label || 'General';
      
      return {
        id: i + 1,
        title: attempt.quizId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Quiz ${i + 1}`,
        subject: subjectLabel,
        score: attempt.score,
        date: formatDateOnly(attempt.completedAt),
        type: attempt.quizId?.includes('practice') ? 'practice' as const : 'module' as const,
        status: attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Passing' : 'Needs Review'
      };
    })
    .filter((quiz) => allowedSubjectLabels.includes(quiz.subject)); // Enforce grade filter

  // Filter quizzes based on active selections
  const filteredQuizzes = recentQuizzes.filter(quiz => {
    // Basic grade restriction check
    if (!allowedSubjectLabels.includes(quiz.subject)) return false;
    
    const subjectMatch = filterSubject === 'all' || quiz.subject === filterSubject;
    const typeMatch = filterType === 'all' || quiz.type === filterType;
    return subjectMatch && typeMatch;
  });

  // Reset subject filter if it's set to a subject not allowed by the grade
  useEffect(() => {
    if (filterSubject === 'all') return;
    if (!allowedSubjectLabels.includes(filterSubject)) {
      setFilterSubject('all');
    }
  }, [allowedSubjectLabels, filterSubject]);

  const handleExportReport = () => {
    const escapeCsvValue = (value: string | number) => {
      const stringValue = String(value ?? '');
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const reportRows: string[] = [];
    const studentName = (userProfile as StudentProfile | null)?.name || currentUser?.displayName || currentUser?.email || 'Student';
    const exportDate = new Date().toISOString().split('T')[0];

    reportRows.push('Grade Report');
    reportRows.push(`Student,${escapeCsvValue(studentName)}`);
    reportRows.push(`Export Date,${escapeCsvValue(exportDate)}`);
    reportRows.push(`Subject Filter,${escapeCsvValue(filterSubject)}`);
    reportRows.push(`Type Filter,${escapeCsvValue(filterType)}`);
    reportRows.push('');

    reportRows.push('Subject Performance');
    reportRows.push('Subject,Average Score');
    displaySubjectPerformance.forEach((subject) => {
      reportRows.push([
        escapeCsvValue(subject.subject),
        escapeCsvValue(subject.average)
      ].join(','));
    });

    reportRows.push('');
    reportRows.push('Recent Quizzes');
    reportRows.push('Title,Subject,Score,Date,Type,Status');

    if (filteredQuizzes.length === 0) {
      reportRows.push('No quiz data available for the selected filters');
    } else {
      filteredQuizzes.forEach((quiz) => {
        reportRows.push([
          escapeCsvValue(quiz.title),
          escapeCsvValue(quiz.subject),
          escapeCsvValue(quiz.score),
          escapeCsvValue(quiz.date),
          escapeCsvValue(quiz.type),
          escapeCsvValue(quiz.status)
        ].join(','));
      });
    }

    const csvContent = reportRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeStudentName = studentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'student';

    link.href = url;
    link.setAttribute('download', `grade-report-${safeStudentName}-${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-50">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-800 tracking-tight">Assessment</h1>
          <p className="text-slate-400 font-bold mt-1 text-[13px]">Review your performance across subjects</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none border-slate-200 text-slate-500 font-bold rounded-xl h-11 px-5 hover:bg-slate-50 hover:text-slate-700">
            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
            This Semester
          </Button>
          <Button className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-5 shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 transition-all" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Award className="w-7 h-7" />
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Overall GPA</p>
            <div className="flex items-end gap-2 mt-2">
              <h3 className="text-4xl font-display font-black text-slate-800">{gpa}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:border-emerald-100 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Target className="w-7 h-7" />
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Average Score</p>
            <div className="flex items-end gap-2 mt-2">
              <h3 className="text-4xl font-display font-black text-slate-800">{averageScore}%</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:border-violet-100 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-violet-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative">
            <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <TrendingUp className="w-7 h-7" />
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Quizzes Completed</p>
            <div className="flex items-end gap-2 mt-2">
              <h3 className="text-4xl font-display font-black text-slate-800">{totalQuizzes}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Assessments Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-full">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <h3 className="font-display font-black text-xl text-slate-800">Recent Assessments</h3>
                <p className="text-slate-400 font-bold text-[13px] mt-1">Your latest quiz and practice results</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="appearance-none w-full pl-4 pr-10 py-2.5 border-none bg-slate-50 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer min-w-[140px] shadow-sm"
                  >
                    <option value="all">All Subjects</option>
                    {allowedSubjectLabels.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="appearance-none w-full pl-4 pr-10 py-2.5 border-none bg-slate-50 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer min-w-[120px] shadow-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="module">Module Quiz</option>
                    <option value="practice">Practice</option>
                  </select>
                  <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 p-2">
              <table className="w-full text-left border-separate border-spacing-y-2 px-4 sm:px-6 mb-4">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-transparent">Assessment</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-transparent min-w-[120px]">Subject</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-transparent">Type</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right border-b border-transparent">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz) => (
                      <tr key={quiz.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-4 rounded-l-2xl">
                          <p className="text-[14px] font-bold text-slate-800">{quiz.title}</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">{quiz.date}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex flex-col gap-1 items-start">
                            <span className="text-[13px] font-bold text-slate-600 truncate max-w-[140px] block">
                              {quiz.subject}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                            quiz.type === 'practice' 
                              ? 'bg-emerald-100/50 text-emerald-600' 
                              : 'bg-indigo-100/50 text-indigo-600'
                          }`}>
                            {quiz.type === 'practice' ? 'Practice' : 'Quiz'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right rounded-r-2xl">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[13px] font-black ${
                            quiz.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            quiz.score >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {quiz.score}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Target className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-500 font-bold text-sm">No recent assessments match the selected filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-6 lg:space-y-8 flex flex-col">
          
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display font-black text-lg text-slate-800">Subject Performance</h3>
            </div>
            
            <div className="space-y-7">
              {displaySubjectPerformance.map((subject, idx) => {
                const colorClasses = colorClassBySubject[subject.color] || colorClassBySubject.slate;
                return (
                  <div key={idx} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colorClasses.dot} group-hover:scale-125 transition-transform`}></span>
                        {subject.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 font-bold ml-4 mt-0.5">{subject.quizzes} activities</p>
                    </div>
                    <span className="text-[15px] font-black text-slate-800">{subject.average}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full ${colorClasses.bar} shadow-sm relative overflow-hidden transition-all duration-1000`}
                      style={{ width: `${Math.max(subject.average, 5)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_ease-out]" />
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 sm:p-8 shadow-[0_12px_30px_-10px_rgba(79,70,229,0.5)] text-white overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mt-10 -mr-10 group-hover:bg-white/20 transition-all duration-700 ease-in-out"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/30 rounded-full blur-2xl -mb-10 -ml-10"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-sm border border-white/20 shadow-sm group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-display font-black tracking-tight mb-2 leading-tight">Keep up the momentum!</h3>
              <p className="text-white/80 text-[13px] font-medium leading-relaxed mb-8 max-w-[90%]">
                You've completed <span className="font-black text-white">{recentQuizzes.length}</span> activities recently. Try a practice session to boost your lowest scores.
              </p>
              <Button className="w-full bg-white text-indigo-600 hover:bg-slate-50 border-0 font-black h-12 rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all">
                Start Practice Session
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GradesPage;
