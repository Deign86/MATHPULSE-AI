import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Grid3X3, ChevronDown, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface HeatmapCell {
  subject: string;
  topic: string;
  mastery: number; // 0-100
  students: number;
}

interface MasteryHeatmapProps {
  /** Optional title override */
  title?: string;
}

// ─── SHS Math Curriculum Data ───────────────────────────────

const SUBJECTS = [
  { id: 'gen-math', name: 'Gen Math', shortName: 'GM', color: '#3B82F6' },
  { id: 'stats-prob', name: 'Stats & Prob', shortName: 'SP', color: '#8B5CF6' },
  { id: 'pre-calc', name: 'Pre-Calc', shortName: 'PC', color: '#F97316' },
  { id: 'basic-calc', name: 'Basic Calc', shortName: 'BC', color: '#EF4444' },
];

const TOPICS_BY_SUBJECT: Record<string, { name: string; unit: string }[]> = {
  'gen-math': [
    { name: 'Functions & Relations', unit: 'Functions' },
    { name: 'Rational Functions', unit: 'Functions' },
    { name: 'Exponential Functions', unit: 'Functions' },
    { name: 'Logarithmic Functions', unit: 'Functions' },
    { name: 'Simple Interest', unit: 'Business Math' },
    { name: 'Compound Interest', unit: 'Business Math' },
    { name: 'Annuities', unit: 'Business Math' },
    { name: 'Propositions', unit: 'Logic' },
    { name: 'Truth Tables', unit: 'Logic' },
  ],
  'stats-prob': [
    { name: 'Random Variables', unit: 'Random Variables' },
    { name: 'Probability Distributions', unit: 'Random Variables' },
    { name: 'Normal Distribution', unit: 'Normal Dist' },
    { name: 'Z-scores', unit: 'Normal Dist' },
    { name: 'Sampling Distributions', unit: 'Sampling' },
    { name: 'Central Limit Theorem', unit: 'Sampling' },
    { name: 'Confidence Intervals', unit: 'Estimation' },
    { name: 'Hypothesis Testing', unit: 'Testing' },
    { name: 'Correlation', unit: 'Regression' },
  ],
  'pre-calc': [
    { name: 'Parabola', unit: 'Conics' },
    { name: 'Ellipse', unit: 'Conics' },
    { name: 'Hyperbola', unit: 'Conics' },
    { name: 'Arithmetic Seq', unit: 'Series' },
    { name: 'Geometric Seq', unit: 'Series' },
    { name: 'Math Induction', unit: 'Series' },
    { name: 'Trig Functions', unit: 'Trigonometry' },
    { name: 'Trig Identities', unit: 'Trigonometry' },
    { name: 'Polar Coords', unit: 'Trigonometry' },
  ],
  'basic-calc': [
    { name: 'Limits', unit: 'Limits' },
    { name: 'Continuity', unit: 'Limits' },
    { name: 'Definition of Deriv.', unit: 'Derivatives' },
    { name: 'Diff. Rules', unit: 'Derivatives' },
    { name: 'Chain Rule', unit: 'Derivatives' },
    { name: 'Related Rates', unit: 'Derivatives' },
    { name: 'Optimization', unit: 'Derivatives' },
    { name: 'Antiderivatives', unit: 'Integration' },
    { name: 'Definite Integrals', unit: 'Integration' },
  ],
};

// ─── Color scale ────────────────────────────────────────────

function getMasteryColor(mastery: number): string {
  if (mastery >= 85) return 'bg-emerald-500';
  if (mastery >= 70) return 'bg-emerald-300';
  if (mastery >= 55) return 'bg-amber-300';
  if (mastery >= 40) return 'bg-orange-400';
  if (mastery >= 20) return 'bg-red-400';
  return 'bg-red-600';
}

function getMasteryTextColor(mastery: number): string {
  if (mastery >= 70) return 'text-white';
  if (mastery >= 40) return 'text-white';
  return 'text-white';
}

function getMasteryBgHex(mastery: number): string {
  if (mastery >= 85) return '#10B981';
  if (mastery >= 70) return '#6EE7B7';
  if (mastery >= 55) return '#FCD34D';
  if (mastery >= 40) return '#FB923C';
  if (mastery >= 20) return '#F87171';
  return '#DC2626';
}

// ─── Generate mock platform data ────────────────────────────

function generateMockData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  // Seed for consistent display
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const subject of SUBJECTS) {
    const topics = TOPICS_BY_SUBJECT[subject.id] || [];
    for (const topic of topics) {
      const mastery = Math.round(pseudoRandom() * 60 + 30); // 30-90 range
      const students = Math.round(pseudoRandom() * 200 + 50); // 50-250
      cells.push({
        subject: subject.id,
        topic: topic.name,
        mastery,
        students,
      });
    }
  }
  return cells;
}

// ─── Component ──────────────────────────────────────────────

const MasteryHeatmap: React.FC<MasteryHeatmapProps> = ({ title = 'Platform-Wide Subject Mastery' }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const allData = useMemo(generateMockData, []);

  const filteredSubjects = selectedSubject === 'all'
    ? SUBJECTS
    : SUBJECTS.filter(s => s.id === selectedSubject);

  // Compute platform-level aggregates
  const platformAvg = Math.round(allData.reduce((s, c) => s + c.mastery, 0) / allData.length);
  const lowestTopic = allData.reduce((min, c) => c.mastery < min.mastery ? c : min, allData[0]);
  const highestTopic = allData.reduce((max, c) => c.mastery > max.mastery ? c : max, allData[0]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e8e5de]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Grid3X3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1a1625]">{title}</h2>
            <p className="text-xs text-[#6b687a]">
              Aggregated mastery levels across all classes • {allData.length} topic-subject combinations
            </p>
          </div>
        </div>

        {/* Subject filter */}
        <div className="relative">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="appearance-none bg-[#f0eeea] border border-[#e8e5de] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-[#6b687a] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">All Subjects</option>
            {SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a8a5b3] pointer-events-none" />
        </div>
      </div>

      {/* Summary mini-cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#f0eeea] rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${platformAvg >= 70 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Minus size={16} className={platformAvg >= 70 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>
          <div>
            <p className="text-lg font-bold text-[#1a1625]">{platformAvg}%</p>
            <p className="text-[10px] text-[#6b687a] uppercase tracking-wider">Platform Average</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1625] truncate">{lowestTopic?.topic}</p>
            <p className="text-[10px] text-red-600 font-semibold">{lowestTopic?.mastery}% — Lowest</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1625] truncate">{highestTopic?.topic}</p>
            <p className="text-[10px] text-emerald-600 font-semibold">{highestTopic?.mastery}% — Highest</p>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        {filteredSubjects.map(subject => {
          const topics = TOPICS_BY_SUBJECT[subject.id] || [];
          const subjectData = allData.filter(c => c.subject === subject.id);
          const subjectAvg = subjectData.length > 0
            ? Math.round(subjectData.reduce((s, c) => s + c.mastery, 0) / subjectData.length)
            : 0;

          return (
            <div key={subject.id} className="mb-5 last:mb-0">
              {/* Subject header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: subject.color }} />
                <span className="text-xs font-bold text-[#1a1625]">{subject.name}</span>
                <span className="text-[10px] text-[#a8a5b3] ml-1">Avg: {subjectAvg}%</span>
              </div>

              {/* Topic grid */}
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${topics.length}, minmax(0, 1fr))` }}>
                {/* Labels row */}
                {topics.map((topic, i) => (
                  <div key={`label-${i}`} className="text-center">
                    <p className="text-[9px] text-[#a8a5b3] truncate px-0.5 mb-1" title={topic.name}>
                      {topic.name}
                    </p>
                  </div>
                ))}

                {/* Heat cells */}
                {topics.map((topic, i) => {
                  const cell = subjectData.find(c => c.topic === topic.name);
                  const mastery = cell?.mastery || 0;
                  const isHovered = hoveredCell?.topic === topic.name && hoveredCell?.subject === subject.id;

                  return (
                    <motion.div
                      key={`cell-${i}`}
                      onMouseEnter={() => cell && setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      whileHover={{ scale: 1.05 }}
                      className={`relative h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ${getMasteryColor(mastery)} ${
                        isHovered ? 'ring-2 ring-white shadow-lg z-10' : ''
                      }`}
                    >
                      <span className={`text-xs font-bold ${getMasteryTextColor(mastery)}`}>
                        {mastery}%
                      </span>

                      {/* Tooltip */}
                      {isHovered && cell && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1625] text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap z-20 shadow-xl pointer-events-none">
                          <p className="font-bold mb-0.5">{cell.topic}</p>
                          <p>Mastery: <strong>{cell.mastery}%</strong></p>
                          <p>Students: <strong>{cell.students}</strong></p>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Color Legend */}
      <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-[#e8e5de]">
        <div className="flex items-center gap-1 text-[10px] text-[#6b687a]">
          <Info size={10} />
          <span>Color scale:</span>
        </div>
        {[
          { label: '0-19%', color: 'bg-red-600' },
          { label: '20-39%', color: 'bg-red-400' },
          { label: '40-54%', color: 'bg-orange-400' },
          { label: '55-69%', color: 'bg-amber-300' },
          { label: '70-84%', color: 'bg-emerald-300' },
          { label: '85-100%', color: 'bg-emerald-500' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="text-[10px] text-[#6b687a]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasteryHeatmap;
