import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, BookOpen, TrendingUp, AlertTriangle, Calendar, MessageCircle, 
  CheckCircle, BarChart3, Clock, AlertCircle, ChevronRight, Menu, X,
  Play, FileText, Target, Zap, Award, Upload, FileSpreadsheet, 
  Video, ClipboardCheck, Info, Bell, Search, Home, Database,
  ChevronLeft, Eye, Download, Send, Edit3, Trash2, Save, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmModal from './ConfirmModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  getClassroomsByTeacher,
  getStudentsByClassroom,
  getStudentsByTeacher,
  subscribeToActivityFeed,
  updateStudentRisk,
  addManagedStudentsBatch,
  deleteManagedStudent,
  type Classroom,
  type ManagedStudent,
  type ClassActivity,
} from '../services/studentService';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

interface TeacherDashboardProps {
  onLogout: () => void;
  onOpenProfile?: () => void;
}

type View = 'dashboard' | 'analytics' | 'intervention' | 'import' | 'edit_records';

// Local view types mapped from service types
interface ClassView {
  id: string;
  name: string;
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface StudentView {
  id: string;
  name: string;
  avatar: string;
  avgScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  weakestTopic: string;
  classroomId: string;
  className: string;
  lastActive: string;
  struggles: string[];
  engagementScore: number;
  attendance: number;
  assignmentCompletion: number;
}

function toClassView(c: Classroom): ClassView {
  const riskLevel = c.atRiskCount >= 5 ? 'high' : c.atRiskCount >= 2 ? 'medium' : 'low';
  return {
    id: c.id,
    name: c.name,
    schedule: c.schedule,
    studentCount: c.studentCount,
    avgScore: c.avgScore,
    atRiskCount: c.atRiskCount,
    riskLevel,
  };
}

function toStudentView(s: ManagedStudent, className: string): StudentView {
  const riskLevel = s.riskLevel.toLowerCase() as 'high' | 'medium' | 'low';
  const lastActiveStr = s.lastActive
    ? formatRelativeTime(s.lastActive.toDate())
    : 'Unknown';
  return {
    id: s.id,
    name: s.name,
    avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
    avgScore: s.avgQuizScore,
    riskLevel,
    weakestTopic: s.weakestTopic || 'N/A',
    classroomId: s.classroomId,
    className,
    lastActive: lastActiveStr,
    struggles: s.struggles || [],
    engagementScore: s.engagementScore,
    attendance: s.attendance,
    assignmentCompletion: s.assignmentCompletion,
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, onOpenProfile }) => {
  const { currentUser, userProfile } = useAuth();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassView | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentView | null>(null);

  // Data from Firebase
  const [classes, setClasses] = useState<ClassView[]>([]);
  const [students, setStudents] = useState<StudentView[]>([]);
  const [liveActivity, setLiveActivity] = useState<{ id: string; student: string; action: string; topic: string; time: string; type: string }[]>([]);
  const [dailyInsight, setDailyInsight] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);

  // Fetch classrooms and students from Firebase
  useEffect(() => {
    if (!currentUser) return;
    const teacherId = currentUser.uid;

    let unsubActivity: (() => void) | undefined;

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const classrooms = await getClassroomsByTeacher(teacherId);
        const classViews = classrooms.map(toClassView);
        setClasses(classViews);

        // Build a map of classroomId -> name
        const classNameMap: Record<string, string> = {};
        classrooms.forEach((c) => { classNameMap[c.id] = c.name; });

        const allStudents = await getStudentsByTeacher(teacherId);
        const studentViews = allStudents.map((s) => toStudentView(s, classNameMap[s.classroomId] || 'Unknown'));
        setStudents(studentViews);

        // Subscribe to live activity
        const classroomIds = classrooms.map((c) => c.id);
        if (classroomIds.length > 0) {
          unsubActivity = subscribeToActivityFeed(classroomIds, (activities) => {
            setLiveActivity(
              activities.map((a) => ({
                id: a.id,
                student: a.studentName,
                action: a.action,
                topic: a.topic,
                time: formatRelativeTime(a.timestamp.toDate()),
                type: a.type,
              }))
            );
          });
        }
      } catch (err) {
        console.error('Failed to load teacher data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubActivity) unsubActivity();
    };
  }, [currentUser]);

  // Fetch AI daily insight when students data is available
  useEffect(() => {
    if (students.length === 0) return;

    const fetchInsight = async () => {
      setInsightLoading(true);
      try {
        const studentData = students.map((s) => ({
          name: s.name,
          engagementScore: s.engagementScore,
          avgQuizScore: s.avgScore,
          attendance: s.attendance,
          riskLevel: s.riskLevel,
        }));
        const response = await apiService.getDailyInsight({ students: studentData });
        setDailyInsight(response.insight);
      } catch {
        setDailyInsight(`${students.filter((s) => s.riskLevel === 'high').length} students are at high risk of falling behind. Review their progress in the analytics view.`);
      } finally {
        setInsightLoading(false);
      }
    };

    fetchInsight();
  }, [students]);

  // Computed stats
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const totalAtRisk = classes.reduce((sum, c) => sum + c.atRiskCount, 0);
  const avgPerformance = classes.length > 0 ? Math.round(classes.reduce((sum, c) => sum + c.avgScore, 0) / classes.length) : 0;

  const riskDistribution = [
    { name: 'High Risk', value: students.filter((s) => s.riskLevel === 'high').length, color: '#ef4444' },
    { name: 'Medium Risk', value: students.filter((s) => s.riskLevel === 'medium').length, color: '#f59e0b' },
    { name: 'Low Risk', value: students.filter((s) => s.riskLevel === 'low').length, color: '#10b981' },
  ];

  // Gather weakest topics as topic performance data
  const topicCounts: Record<string, { total: number; sum: number }> = {};
  students.forEach((s) => {
    if (s.weakestTopic && s.weakestTopic !== 'N/A') {
      if (!topicCounts[s.weakestTopic]) topicCounts[s.weakestTopic] = { total: 0, sum: 0 };
      topicCounts[s.weakestTopic].total += 1;
      topicCounts[s.weakestTopic].sum += s.avgScore;
    }
  });
  const topicPerformance = Object.entries(topicCounts)
    .map(([topic, data]) => ({ topic, score: Math.round(data.sum / data.total) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const handleViewClass = (classItem: ClassView) => {
    setSelectedClass(classItem);
    setActiveView('analytics');
  };

  const handleViewStudent = (student: StudentView) => {
    setSelectedStudent(student);
    setActiveView('intervention');
  };

  const handleBackToAnalytics = () => {
    setSelectedStudent(null);
    setActiveView('analytics');
  };

  const handleBackToDashboard = () => {
    setSelectedClass(null);
    setSelectedStudent(null);
    setActiveView('dashboard');
  };

  const teacherName = userProfile?.name || 'Teacher';

  if (dataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-600" />
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Collapsible Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        className="bg-white border-r border-gray-200 flex flex-col shadow-sm"
      >
        {/* Logo & Toggle */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800">MathPulse AI</h1>
                <p className="text-xs text-slate-500">Teacher Portal</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={Home}
            label="Dashboard"
            active={activeView === 'dashboard'}
            collapsed={sidebarCollapsed}
            onClick={handleBackToDashboard}
          />
          <NavItem
            icon={BarChart3}
            label="Class Analytics"
            active={activeView === 'analytics'}
            collapsed={sidebarCollapsed}
            onClick={() => setActiveView('analytics')}
          />
          <NavItem
            icon={Database}
            label="Data Import"
            active={activeView === 'import'}
            collapsed={sidebarCollapsed}
            onClick={() => setActiveView('import')}
          />
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100">
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <button
                onClick={onOpenProfile}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group"
              >
                <img
                  src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=random`}
                  alt="Teacher"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">{teacherName}</p>
                  <p className="text-xs text-slate-500">Teacher</p>
                </div>
              </button>
              <Button
                onClick={() => setShowLogoutConfirm(true)}
                variant="outline"
                className="w-full border-gray-200 hover:border-red-500 hover:text-red-500 font-bold text-sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full p-3 hover:bg-red-50 rounded-xl transition-all"
            >
              <X size={20} className="text-red-500 mx-auto" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {activeView === 'dashboard' && 'Teacher Dashboard'}
                {activeView === 'analytics' && (selectedClass ? selectedClass.name : 'Class Analytics')}
                {activeView === 'intervention' && 'Student Intervention'}
                {activeView === 'import' && 'Data Import'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeView === 'dashboard' && `Welcome back, ${teacherName}`}
                {activeView === 'analytics' && 'Deep dive into class performance'}
                {activeView === 'intervention' && selectedStudent?.name}
                {activeView === 'import' && 'Upload class records and materials'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 bg-gray-100 rounded-xl text-slate-600 hover:bg-gray-200 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-3 bg-gray-100 rounded-xl text-slate-600 hover:bg-gray-200 transition-colors">
                <Calendar size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <DashboardView
                classes={classes}
                liveActivity={liveActivity}
                onViewClass={handleViewClass}
                dailyInsight={dailyInsight}
                insightLoading={insightLoading}
                totalStudents={totalStudents}
                totalAtRisk={totalAtRisk}
                avgPerformance={avgPerformance}
              />
            )}
            {activeView === 'analytics' && (
              <AnalyticsView
                selectedClass={selectedClass || classes[0]}
                students={selectedClass ? students.filter((s) => s.classroomId === selectedClass.id) : students}
                riskDistribution={riskDistribution}
                topicPerformance={topicPerformance}
                onViewStudent={handleViewStudent}
                onBack={handleBackToDashboard}
              />
            )}
            {activeView === 'intervention' && selectedStudent && (
              <InterventionView
                student={selectedStudent}
                onBack={handleBackToAnalytics}
              />
            )}
            {activeView === 'import' && <ImportView onEditRecords={() => setActiveView('edit_records')} />}
            {activeView === 'edit_records' && (
              <EditRecordsView
                students={students}
                onBack={() => setActiveView('import')}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
      />
    </div>
  );
};

// Navigation Item Component
const NavItem: React.FC<{
  icon: any;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
      active
        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
        : 'text-slate-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={20} />
    {!collapsed && <span>{label}</span>}
  </button>
);

// Dashboard View
const DashboardView: React.FC<{
  classes: ClassView[];
  liveActivity: { id: string; student: string; action: string; topic: string; time: string; type: string }[];
  onViewClass: (classItem: ClassView) => void;
  dailyInsight: string;
  insightLoading: boolean;
  totalStudents: number;
  totalAtRisk: number;
  avgPerformance: number;
}> = ({ classes, liveActivity, onViewClass, dailyInsight, insightLoading, totalStudents, totalAtRisk, avgPerformance }) => {
  const riskPercentage = totalStudents > 0 ? Math.round((totalAtRisk / totalStudents) * 100) : 0;
  const engagementRate = totalStudents > 0 ? Math.round(((totalStudents - totalAtRisk) / totalStudents) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* Daily AI Insight Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 text-white shadow-lg">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Daily AI Insight</h2>
            <p className="text-blue-100 text-lg">
              {insightLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Generating AI insight...
                </span>
              ) : (
                dailyInsight || `${totalAtRisk} students (${riskPercentage}%) are at high risk of falling behind`
              )}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <p className="text-sm text-blue-100 mb-1">Class Average</p>
            <p className="text-3xl font-bold">{avgPerformance}%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <p className="text-sm text-blue-100 mb-1">Engagement Rate</p>
            <p className="text-3xl font-bold">{engagementRate}%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <p className="text-sm text-blue-100 mb-1">At Risk Students</p>
            <p className="text-3xl font-bold">{totalAtRisk}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Classes - 2 columns */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">My Classes</h2>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
              View All
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4">
            {classes.map((classItem) => (
              <motion.div
                key={classItem.id}
                whileHover={{ scale: 1.01 }}
                className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}
                onClick={() => onViewClass(classItem)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">{classItem.name}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRiskBadge(classItem.riskLevel)}`}>
                        {classItem.riskLevel === 'high' ? 'High Risk' : classItem.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={14} />
                      <span>{classItem.schedule}</span>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white font-bold px-6 py-2 rounded-xl">
                    View Class
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Students</p>
                    <p className="text-xl font-bold text-slate-800">{classItem.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">At Risk</p>
                    <p className="text-xl font-bold text-red-600">{classItem.atRiskCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-blue-600">{classItem.avgScore}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Classroom Pulse - 1 column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-cyan-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Live Classroom Pulse</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-3 max-h-[600px] overflow-y-auto">
            {liveActivity.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-xl border-l-4 ${
                  activity.type === 'success' ? 'bg-green-50 border-green-500' :
                  activity.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-slate-800 text-sm">{activity.student}</p>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
                <p className="text-sm text-slate-600">
                  {activity.action} <span className="font-bold text-slate-800">{activity.topic}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Analytics View
const AnalyticsView: React.FC<{
  selectedClass: ClassView;
  students: StudentView[];
  riskDistribution: { name: string; value: number; color: string }[];
  topicPerformance: { topic: string; score: number }[];
  onViewStudent: (student: StudentView) => void;
  onBack: () => void;
}> = ({ selectedClass, students, riskDistribution, topicPerformance, onViewStudent, onBack }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Split View */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left Column - Student List */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">Students ({students.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                placeholder="Search..."
                className="w-40 pl-9 pr-4 py-2 rounded-xl border-gray-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto">
            {students.map((student) => (
              <motion.div
                key={student.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => onViewStudent(student)}
                className={`p-4 rounded-2xl border-2 cursor-pointer hover:shadow-md transition-all ${getRiskColor(student.riskLevel)}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-current"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{student.name}</h4>
                    <p className="text-xs text-slate-600">{student.lastActive}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Avg Score</span>
                    <span className="text-xs font-bold text-slate-800">{student.avgScore}%</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        student.riskLevel === 'high' ? 'bg-red-500' :
                        student.riskLevel === 'medium' ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${student.avgScore}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="col-span-3 space-y-6">
          {/* Risk Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Topic Performance</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Action Items */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Validate AI Links</h3>
                  <p className="text-sm text-slate-600">Review AI-generated interventions</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                Pending
              </span>
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white font-bold py-3 rounded-xl">
              Review Now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Intervention View
const InterventionView: React.FC<{
  student: StudentView;
  onBack: () => void;
}> = ({ student, onBack }) => {
  const [learningPath, setLearningPath] = useState<string>('');
  const [pathLoading, setPathLoading] = useState(true);

  useEffect(() => {
    const fetchPath = async () => {
      setPathLoading(true);
      try {
        const response = await apiService.getLearningPath({
          weaknesses: student.struggles.length > 0 ? student.struggles : [student.weakestTopic],
          gradeLevel: 'High School',
        });
        setLearningPath(response.learningPath);
      } catch {
        setLearningPath('Unable to generate learning path. Please try again later.');
      } finally {
        setPathLoading(false);
      }
    };
    fetchPath();
  }, [student]);

  const remedialSteps = [
    { id: 1, type: 'video', title: `${student.weakestTopic} Fundamentals`, duration: '8 mins', icon: Video },
    { id: 2, type: 'quiz', title: `${student.weakestTopic} Practice`, questions: 10, icon: ClipboardCheck },
    { id: 3, type: 'assessment', title: 'Final Check', questions: 5, icon: CheckCircle }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Analytics
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Student Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <div className="flex items-start gap-6">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-24 h-24 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-800">{student.name}</h1>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-bold border-2 ${getRiskBadge(student.riskLevel)}`}>
                  {student.riskLevel === 'high' ? 'High Risk' : student.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                </span>
              </div>
              <p className="text-slate-600 mb-4">{student.className}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Avg Score</p>
                  <p className="text-2xl font-bold text-slate-800">{student.avgScore}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Last Active</p>
                  <p className="text-sm font-bold text-slate-800">{student.lastActive}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Weakest Topic</p>
                  <p className="text-sm font-bold text-red-600">{student.weakestTopic}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">AI Analysis - Learning Barriers</h2>
              {pathLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Generating AI analysis...</span>
                </div>
              ) : (
                <div className="space-y-2 text-slate-700">
                  {student.struggles.length > 0 ? (
                    student.struggles.map((s, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">•</span>
                        <span>Struggles with <strong>{s}</strong></span>
                      </p>
                    ))
                  ) : (
                    <p className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Needs support in <strong>{student.weakestTopic}</strong></span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI-Generated Learning Path */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">AI-Generated Learning Path</h2>
          
          {pathLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              <span>Generating personalized learning path...</span>
            </div>
          ) : learningPath ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 whitespace-pre-wrap text-sm text-slate-700">
              {learningPath}
            </div>
          ) : null}
          
          <div className="space-y-4 relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>

            {remedialSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Step Number Circle */}
                  <div className="absolute left-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                    <Icon size={24} className="text-white" />
                  </div>

                  {/* Step Content */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800 mb-1">{step.title}</h3>
                        <p className="text-sm text-slate-600">
                          {step.type === 'video' && `${(step as any).duration} video lesson`}
                          {step.type === 'quiz' && `${(step as any).questions} practice questions`}
                          {step.type === 'assessment' && `${(step as any).questions} assessment questions`}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        step.type === 'video' ? 'bg-purple-100 text-purple-700' :
                        step.type === 'quiz' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {step.type === 'video' ? 'Video' : step.type === 'quiz' ? 'Quiz' : 'Assessment'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Send size={20} />
            Schedule One-on-One Session
          </Button>
          <Button
            variant="outline"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Export Printed Materials
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Import View
const ImportView: React.FC<{ onEditRecords: () => void }> = ({ onEditRecords }) => {
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadResult('');
    try {
      const result = await apiService.uploadClassRecords(file);
      if (result.success) {
        toast.success(`Successfully imported ${result.students.length} student records`);
        setUploadResult(`Imported ${result.students.length} students. Column mapping: ${JSON.stringify(result.columnMapping)}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setUploadResult('Upload failed. Please check the file format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver1(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-slate-800">Import Data</h2>
          <p className="text-slate-500">Upload class records and course materials to enhance AI predictions</p>
        </div>

        {/* Upload Zones */}
        <div className="grid grid-cols-2 gap-6">
          {/* Class Records */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
            onDragLeave={() => setDragOver1(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50 ${
              dragOver1 ? 'border-blue-600 bg-blue-50 scale-105' : 'border-gray-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              {uploading ? (
                <Loader2 size={40} className="text-blue-600 animate-spin" />
              ) : (
                <FileSpreadsheet size={40} className="text-blue-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Class Records</h3>
            <p className="text-slate-600 mb-4">
              {uploading ? 'Uploading and analyzing...' : 'Upload student grades, attendance, and quiz scores'}
            </p>
            <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-2">
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.csv</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.xlsx</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.pdf</span>
            </p>
            <Button className="bg-white border-2 border-gray-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>

          {/* Course Materials */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
            onDragLeave={() => setDragOver2(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver2(false); }}
            className={`bg-white border-4 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer hover:border-amber-400 hover:bg-amber-50 ${
              dragOver2 ? 'border-amber-600 bg-amber-50 scale-105' : 'border-gray-300'
            }`}
          >
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText size={40} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Course Materials</h3>
            <p className="text-slate-600 mb-4">Upload syllabus, lesson plans, and curriculum documents</p>
            <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-2">
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.pdf</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.docx</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-slate-600 font-medium">.txt</span>
            </p>
            <Button className="bg-white border-2 border-gray-200 text-slate-600 hover:border-amber-500 hover:text-amber-600 font-bold px-6 py-3 rounded-xl w-full transition-colors">
              Click or drag & drop
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-blue-800 mb-3">How AI Uses Your Data</h3>
          <div className="space-y-2 text-blue-900/80 text-sm">
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong className="text-blue-800">Smart Format Detection:</strong> AI understands various spreadsheet formats and column names</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Analyzes historical performance patterns to predict at-risk students</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Maps curriculum topics to student knowledge gaps</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Generates personalized remedial learning paths</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>All data is processed securely and never shared</span>
            </p>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
            {uploadResult}
          </div>
        )}

        {/* Manage Imported Data */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Manage Imported Data</h3>
          <button 
            onClick={onEditRecords}
            className="w-full bg-[#00a86b] hover:bg-[#008f5d] text-white rounded-xl p-5 flex items-center justify-between transition-all shadow-sm hover:shadow-md group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Edit3 size={24} className="text-white" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-lg">Edit Class Records</h4>
                <p className="text-white/90 text-sm">Review and correct AI-analyzed student data</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Edit Records View
const EditRecordsView: React.FC<{
  students: StudentView[];
  onBack: () => void;
}> = ({ students: initialStudents, onBack }) => {
  const [students, setStudents] = useState(initialStudents);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update risk levels for all students via AI
      for (const student of students) {
        try {
          const prediction = await apiService.predictRisk({
            engagementScore: student.engagementScore,
            avgQuizScore: student.avgScore,
            attendance: student.attendance,
            assignmentCompletion: student.assignmentCompletion,
          });
          await updateStudentRisk(student.id, prediction.riskLevel, prediction.confidence);
        } catch {
          // Continue with other students if one fails
        }
      }
      toast.success('Records saved and risk levels updated');
      onBack();
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-slate-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Class Records</h1>
            <p className="text-slate-500">Review and modify student data manually</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="border-gray-300">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
           <div className="flex items-center gap-2 text-slate-600">
             <Info size={18} />
             <span className="text-sm">Click on any field to edit</span>
           </div>
           <div className="text-sm text-slate-500">
             Showing {students.length} records
           </div>
        </div>
        
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Student Name</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">ID</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Class</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Avg Score</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Risk Level</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Weakest Topic</th>
                <th className="p-4 font-bold text-slate-700 border-b border-gray-200 bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-blue-50/30 group transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={student.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-medium text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-mono text-sm">{student.id.padStart(6, '0')}</td>
                  <td className="p-4 text-slate-600">{student.className}</td>
                  <td className="p-4">
                    <span className={`font-bold ${
                      student.avgScore < 60 ? 'text-red-600' : 
                      student.avgScore < 80 ? 'text-amber-600' : 'text-green-600'
                    }`}>{student.avgScore}%</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskBadge(student.riskLevel)}`}>
                      {student.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{student.weakestTopic}</td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// Helper function (moved outside component to avoid hook issues)
function getRiskBadge(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
  }
}

function getRiskColor(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'border-red-500 bg-red-50';
    case 'medium': return 'border-amber-500 bg-amber-50';
    case 'low': return 'border-green-500 bg-green-50';
  }
}

export default TeacherDashboard;
