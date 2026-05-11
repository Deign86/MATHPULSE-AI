import React, { useState } from 'react';
import { Search, Bell, Users, Target, AlertCircle, TrendingDown, FileText, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export interface ClassView {
  id: string;
  name: string;
  classSectionId?: string;
  gradeLevel?: string;
  schedule: string;
  studentCount: number;
  avgScore: number;
  atRiskCount: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface ClassesOverviewMenuProps {
  classes: ClassView[];
  onSelectClass: (classItem: ClassView) => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  insightDismissed?: boolean;
  onOpenInsightModal?: () => void;
}

export const CLASS_COLORS = [
  { hex: '#9956DE', bg: 'bg-[#9956DE]/10', border: 'border-[#9956DE]/20', borderLeft: 'border-l-[#9956DE]', text: 'text-[#9956DE]', groupHover: 'group-hover:text-[#9956DE]' }, // Amethyst
  { hex: '#7274ED', bg: 'bg-[#7274ED]/10', border: 'border-[#7274ED]/20', borderLeft: 'border-l-[#7274ED]', text: 'text-[#7274ED]', groupHover: 'group-hover:text-[#7274ED]' }, // Slate Blue
  { hex: '#1FA7E1', bg: 'bg-[#1FA7E1]/10', border: 'border-[#1FA7E1]/20', borderLeft: 'border-l-[#1FA7E1]', text: 'text-[#1FA7E1]', groupHover: 'group-hover:text-[#1FA7E1]' }, // Summer Sky
  { hex: '#6ED1CF', bg: 'bg-[#6ED1CF]/10', border: 'border-[#6ED1CF]/20', borderLeft: 'border-l-[#6ED1CF]', text: 'text-[#6ED1CF]', groupHover: 'group-hover:text-[#6ED1CF]' }, // Downy
  { hex: '#FFB356', bg: 'bg-[#FFB356]/10', border: 'border-[#FFB356]/20', borderLeft: 'border-l-[#FFB356]', text: 'text-[#FFB356]', groupHover: 'group-hover:text-[#FFB356]' }, // Texas Rose
];

export const ClassesOverviewMenu: React.FC<ClassesOverviewMenuProps> = ({
  classes,
  onSelectClass,
  onOpenNotifications,
  onOpenProfile,
  insightDismissed,
  onOpenInsightModal,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Global Stats calculation
  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalAtRisk = classes.reduce((sum, c) => sum + (c.atRiskCount || 0), 0);
  const avgPerformance = classes.length > 0 
    ? (classes.reduce((sum, c) => sum + (c.avgScore || 0), 0) / classes.length).toFixed(1)
    : 0;

  // Filter classes by global search query
  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.gradeLevel || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto w-full block">
      <div className="max-w-[1400px] mx-auto p-[24px] xl:p-[32px] space-y-[24px]">
        
        {/* Top Navigation & Global Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center bg-white/80 px-4 py-2.5 rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white backdrop-blur-[12px] group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Search className="w-4 h-4 text-[#64748b] shrink-0 group-focus-within:text-[#4f46e5] transition-colors" />
              <input 
                type="text" 
                placeholder="Global search for a student across all classes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none ml-3 text-[13px] w-full text-[#475569] placeholder:text-[#94a3b8]" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {/* AI Insight Button */}
            {insightDismissed && (
              <div className="relative group">
                <button
                  onClick={onOpenInsightModal}
                  className="relative w-10 h-10 flex items-center justify-center bg-[#eef2ff]/80 hover:bg-[#e0e7ff] rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#a5b4fc]/60 text-[#4f46e5] transition-colors"
                  aria-label="View AI Insight"
                >
                  <Sparkles className="w-4 h-4" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 border border-white animate-pulse" />
                </button>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-[#1e293b] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  AI Insight
                </span>
              </div>
            )}
            {/* Notification Bell */}
            <button 
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>

            <div 
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors h-10"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                <img src={userProfile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || currentUser?.displayName || 'Teacher')}&background=random`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold text-[#1e293b]">{userProfile?.name || currentUser?.displayName || 'Teacher'}</span>
            </div>
          </div>
        </div>

        <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight">Classes Overview</h1>

        {/* Global Stats & Alerts Row (Vibrant Palette) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[16px]">
          {/* Global Stats Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
            
            {/* Card 1 (Attendance / Green) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(16,185,129,0.2)] flex flex-col justify-between h-full group text-white">
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="flex items-start justify-between relative z-10 mb-4">
                <span className="text-[13px] font-medium text-white/90">Attendance rate</span>
                <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-[32px] font-bold relative z-10 leading-none mb-6">94%</div>
              <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3">
                <span className="text-[12px] font-medium text-white/90">Active participants</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-[4px] backdrop-blur-sm">{totalStudents > 0 ? Math.round(totalStudents * 0.94) : 0}</span>
              </div>
            </div>
            
            {/* Card 2 (Global Average / Blue) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(14,165,233,0.2)] flex flex-col justify-between h-full group text-white">
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="flex items-start justify-between relative z-10 mb-4">
                <span className="text-[13px] font-medium text-white/90">Class average</span>
                <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                  <Target className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-[32px] font-bold relative z-10 leading-none mb-6">{avgPerformance}%</div>
              <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3">
                <span className="text-[12px] font-medium text-white/90">Vs. last month</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-[4px] backdrop-blur-sm">+2.1%</span>
              </div>
            </div>
            
            {/* Card 3 (Total At-Risk / Orange) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(249,115,22,0.2)] flex flex-col justify-between h-full group text-white">
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="flex items-start justify-between relative z-10 mb-4">
                <span className="text-[13px] font-medium text-white/90">At risk</span>
                <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-[32px] font-bold relative z-10 leading-none mb-6">{totalAtRisk}</div>
              <div className="flex items-center justify-between relative z-10 border-t border-white/20 pt-3">
                <span className="text-[12px] font-medium text-white/90">Requires attention</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-[4px] backdrop-blur-sm">
                  {totalStudents > 0 ? Math.round((totalAtRisk / totalStudents) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          {/* AI Action Items (Purple Theme) */}
          <div className="lg:col-span-4 relative overflow-hidden bg-gradient-to-br from-[#a855f7] to-[#9333ea] rounded-[16px] p-[20px] shadow-[0_4px_12px_rgba(168,85,247,0.2)] flex flex-col text-white">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full"></div>

            <div className="flex justify-between items-center mb-4 relative z-10 border-b border-white/20 pb-3">
              <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                AI Action Items
              </h3>
              <span className="text-[10px] font-bold text-[#9333ea] bg-white px-2 py-0.5 rounded-[4px]">2 Pending</span>
            </div>
            
            <div className="space-y-[8px] flex-1 overflow-y-auto no-scrollbar relative z-10">
              {/* Alert 1 */}
              <div className="bg-white/10 hover:bg-white/20 rounded-[8px] p-3 text-[12px] border border-white/10 transition-colors backdrop-blur-sm group cursor-pointer flex gap-3 items-start">
                <div className="mt-0.5 shrink-0 text-white/80 group-hover:text-white transition-colors">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="leading-snug text-white/90">
                  <span className="font-bold text-white">Grade 11 - Section B</span> average dropped by 4% after the last quiz.
                </div>
              </div>
              
              {/* Alert 2 */}
              <div className="bg-white/10 hover:bg-white/20 rounded-[8px] p-3 text-[12px] border border-white/10 transition-colors backdrop-blur-sm group cursor-pointer flex gap-3 items-start">
                <div className="mt-0.5 shrink-0 text-white/80 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="leading-snug text-white/90">
                  <span className="font-bold text-white">3 Lesson Plans</span> generated and awaiting your review.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Classes Grid Section */}
        <div className="bg-white/60 backdrop-blur-[12px] rounded-[24px] p-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-white mt-[24px]">
          <div className="mb-6 border-b border-[#f1f5f9] pb-4">
            <h2 className="text-[18px] font-semibold text-[#1e293b]">My Classes</h2>
          </div>

          {/* Grid of Classes */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[16px]">
            {filteredClasses.map((classItem, idx) => {
              const color = CLASS_COLORS[idx % CLASS_COLORS.length];
              
              let riskBadge = null;
              if (classItem.riskLevel === 'high') {
                riskBadge = (
                  <span className="inline-flex px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md border border-rose-100/50 uppercase">
                    High Risk
                  </span>
                );
              } else if (classItem.riskLevel === 'medium') {
                riskBadge = (
                  <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md border border-amber-100/50 uppercase">
                    Medium Risk
                  </span>
                );
              } else {
                riskBadge = (
                  <span className="inline-flex px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md border border-emerald-100/50 uppercase">
                    On Track
                  </span>
                );
              }

              return (
                <div 
                  key={classItem.id}
                  onClick={() => onSelectClass(classItem)} 
                  className={`flex flex-col p-[16px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 rounded-[18px] transition-all cursor-pointer group border border-[#f1f5f9] border-l-[6px] ${color.borderLeft}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[12px] ${color.bg} flex items-center justify-center border ${color.border}`}>
                        <BookOpen className={`w-5 h-5 ${color.text}`} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-[14px] text-[#1e293b] mb-0.5 transition-colors ${color.groupHover}`}>
                          {classItem.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                          {classItem.gradeLevel || 'Senior High'}
                        </p>
                      </div>
                    </div>
                    {riskBadge}
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[#475569] bg-[#f8fafc] rounded-[12px] p-3 border border-[#f1f5f9]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Students</span>
                      <span className="font-semibold text-[#1e293b]">{classItem.studentCount}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-[#e2e8f0]"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Average</span>
                      <span className="font-semibold text-[#1e293b]">{classItem.avgScore}%</span>
                    </div>
                    <div className="w-[1px] h-8 bg-[#e2e8f0]"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">Schedule</span>
                      <span className="font-semibold text-[#1e293b]">{classItem.schedule || 'Mon-Fri'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredClasses.length === 0 && (
              <div className="col-span-full py-8 text-center text-[#64748b] text-[13px] bg-[#f8fafc] rounded-[18px] border border-[#e2e8f0]">
                No classes match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
