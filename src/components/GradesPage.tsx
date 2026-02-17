import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Award, Target, Calendar, Download, Filter, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';

const GradesPage = () => {
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Mock grades data
  const overallStats = {
    gpa: 3.85,
    totalQuizzes: 24,
    averageScore: 87.5,
    trend: 'up',
    trendValue: 5.2
  };

  const subjectPerformance = [
    { subject: 'General Mathematics', average: 90, quizzes: 6, color: 'blue', trend: 'up' },
    { subject: 'Pre-Calculus', average: 88, quizzes: 8, color: 'teal', trend: 'up' },
    { subject: 'Statistics and Probability', average: 86, quizzes: 5, color: 'cyan', trend: 'down' },
    { subject: 'Basic Calculus', average: 85, quizzes: 5, color: 'orange', trend: 'up' },
  ];

  const recentQuizzes = [
    { id: 1, title: 'Module Quiz: Functions', subject: 'Pre-Calculus', score: 88, total: 100, date: '2024-02-08', type: 'module', status: 'passed' },
    { id: 2, title: 'Practice Quiz: Limits', subject: 'Basic Calculus', score: 92, total: 100, date: '2024-02-07', type: 'practice', status: 'passed' },
    { id: 3, title: 'Module Quiz: Number Systems', subject: 'General Mathematics', score: 85, total: 100, date: '2024-02-05', type: 'module', status: 'passed' },
    { id: 4, title: 'Practice Quiz: Data Presentation', subject: 'Statistics and Probability', score: 92, total: 100, date: '2024-02-03', type: 'practice', status: 'passed' },
    { id: 5, title: 'Module Quiz: Derivatives', subject: 'Basic Calculus', score: 90, total: 100, date: '2024-02-01', type: 'module', status: 'passed' },
    { id: 6, title: 'Practice Quiz: Polynomials', subject: 'Pre-Calculus', score: 82, total: 100, date: '2024-01-30', type: 'practice', status: 'passed' },
    { id: 7, title: 'Module Quiz: Percentages', subject: 'General Mathematics', score: 75, total: 100, date: '2024-01-28', type: 'module', status: 'passed' },
    { id: 8, title: 'Practice Quiz: Central Tendency', subject: 'Statistics and Probability', score: 78, total: 100, date: '2024-01-26', type: 'practice', status: 'passed' },
  ];

  const filteredQuizzes = recentQuizzes.filter(quiz => {
    const subjectMatch = filterSubject === 'all' || quiz.subject === filterSubject;
    const typeMatch = filterType === 'all' || quiz.type === filterType;
    return subjectMatch && typeMatch;
  });

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
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
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-3xl p-8 text-white shadow-xl">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award size={20} className="text-yellow-300" />
              <span className="text-sm text-blue-100">Overall GPA</span>
            </div>
            <p className="text-4xl font-bold">{overallStats.gpa}</p>
            <div className="flex items-center gap-1 mt-2">
              {overallStats.trend === 'up' ? (
                <TrendingUp size={16} className="text-green-300" />
              ) : (
                <TrendingDown size={16} className="text-red-300" />
              )}
              <span className="text-xs text-blue-100">+{overallStats.trendValue}% this month</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={20} className="text-yellow-300" />
              <span className="text-sm text-blue-100">Average Score</span>
            </div>
            <p className="text-4xl font-bold">{overallStats.averageScore}%</p>
            <p className="text-xs text-blue-100 mt-2">Across all subjects</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-yellow-300" />
              <span className="text-sm text-blue-100">Total Quizzes</span>
            </div>
            <p className="text-4xl font-bold">{overallStats.totalQuizzes}</p>
            <p className="text-xs text-blue-100 mt-2">Completed</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award size={20} className="text-yellow-300" />
              <span className="text-sm text-blue-100">Grade Rank</span>
            </div>
            <p className="text-4xl font-bold">Top 15%</p>
            <p className="text-xs text-blue-100 mt-2">In your class</p>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Subject Performance</h2>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {subjectPerformance.map((subject) => (
            <motion.div
              key={subject.subject}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 mb-1">{subject.subject}</h3>
                  <p className="text-xs text-slate-500">{subject.quizzes} quizzes completed</p>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-${subject.color}-50 flex items-center justify-center`}>
                  <span className={`text-xl font-bold text-${subject.color}-600`}>
                    {getGradeLetter(subject.average)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">{subject.average}%</p>
                  <p className="text-xs text-slate-500 mt-1">Average</p>
                </div>
                <div className="flex items-center gap-1">
                  {subject.trend === 'up' ? (
                    <TrendingUp size={18} className="text-green-500" />
                  ) : (
                    <TrendingDown size={18} className="text-red-500" />
                  )}
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quiz History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Quiz History</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            >
              <option value="all">All Subjects</option>
              <option value="General Mathematics">General Mathematics</option>
              <option value="Pre-Calculus">Pre-Calculus</option>
              <option value="Statistics and Probability">Statistics and Probability</option>
              <option value="Basic Calculus">Basic Calculus</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            >
              <option value="all">All Types</option>
              <option value="practice">Practice</option>
              <option value="module">Module</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Quiz</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Score</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm">{quiz.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{quiz.subject}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg capitalize">
                      {quiz.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getGradeColor(quiz.score)}`}>
                        {quiz.score}%
                      </span>
                      <span className="text-xs text-slate-400">({quiz.score}/{quiz.total})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{quiz.date}</span>
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
              <Filter size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No quizzes found with current filters</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradesPage;