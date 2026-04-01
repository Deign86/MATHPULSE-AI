import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Grid3X3, ChevronDown, Info, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  { id: 'stats-prob', name: 'Stats & Prob', shortName: 'SP', color: '#0ea5e9' },
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
  if (mastery >= 55) return 'bg-rose-300';
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

// ─── Component ──────────────────────────────────────────────

const MasteryHeatmap: React.FC<MasteryHeatmapProps> = ({ title = 'Platform-Wide Subject Mastery' }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [allData, setAllData] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch and aggregate progress data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'progress'));

        // Aggregate: topicKey -> { totalMastery, count }
        const aggMap: Record<string, { totalMastery: number; count: number }> = {};

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const subjects = data.subjects as Record<string, { subjectId: string; progress: number }> || {};

          for (const [subjectId, subjectProg] of Object.entries(subjects)) {
            const topics = TOPICS_BY_SUBJECT[subjectId] || [];
            const mastery = subjectProg?.progress ?? 0;

            for (const topic of topics) {
              const key = `${subjectId}::${topic.name}`;
              if (!aggMap[key]) aggMap[key] = { totalMastery: 0, count: 0 };
              aggMap[key].totalMastery += mastery;
              aggMap[key].count += 1;
            }
          }
        });

        // Build HeatmapCell array
        const cells: HeatmapCell[] = [];
        for (const subject of SUBJECTS) {
          const topics = TOPICS_BY_SUBJECT[subject.id] || [];
          for (const topic of topics) {
            const key = `${subject.id}::${topic.name}`;
            const agg = aggMap[key];
            cells.push({
              subject: subject.id,
              topic: topic.name,
              mastery: agg && agg.count > 0 ? Math.round(agg.totalMastery / agg.count) : 0,
              students: agg?.count ?? 0,
            });
          }
        }

        setAllData(cells);
      } catch (err) {
        console.error('[MasteryHeatmap] Error fetching progress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSubjects = selectedSubject === 'all'
    ? SUBJECTS
    : SUBJECTS.filter(s => s.id === selectedSubject);

  // Compute platform-level aggregates
  const activeData = allData.filter(c => c.students > 0);
  const platformAvg = activeData.length > 0
    ? Math.round(activeData.reduce((s, c) => s + c.mastery, 0) / activeData.length)
    : 0;
  const lowestTopic = activeData.length > 0
    ? activeData.reduce((min, c) => c.mastery < min.mastery ? c : min, activeData[0])
    : null;
  const highestTopic = activeData.length > 0
    ? activeData.reduce((max, c) => c.mastery > max.mastery ? c : max, activeData[0])
    : null;

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb] flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-sky-500 animate-spin" />
          <p className="text-sm text-[#5a6578]">Loading mastery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#dde3eb]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center">
            <Grid3X3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0a1628]">{title}</h2>
            <p className="text-xs text-[#5a6578]">
              Aggregated mastery levels across all classes • {allData.filter(c => c.students > 0).length} tracked combinations
            </p>
          </div>
        </div>

        {/* Subject filter */}
        <div className="relative">
          <select
            id="mastery-heatmap-subject-filter"
            name="masteryHeatmapSubjectFilter"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="appearance-none bg-[#edf1f7] border border-[#dde3eb] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-[#5a6578] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="all">All Subjects</option>
            {SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Summary mini-cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#edf1f7] rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${platformAvg >= 70 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <Minus size={16} className={platformAvg >= 70 ? 'text-emerald-600' : 'text-rose-600'} />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0a1628]">{platformAvg}%</p>
            <p className="text-[10px] text-[#5a6578] uppercase tracking-wider">Platform Average</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0a1628] truncate">{lowestTopic?.topic}</p>
            <p className="text-[10px] text-red-600 font-semibold">{lowestTopic?.mastery}% — Lowest</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0a1628] truncate">{highestTopic?.topic}</p>
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
                <span className="text-xs font-bold text-[#0a1628]">{subject.name}</span>
                <span className="text-[10px] text-slate-500 ml-1">Avg: {subjectAvg}%</span>
              </div>

              {/* Topic grid */}
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${topics.length}, minmax(0, 1fr))` }}>
                {/* Labels row */}
                {topics.map((topic, i) => (
                  <div key={`label-${i}`} className="text-center">
                    <p className="text-[9px] text-slate-500 truncate px-0.5 mb-1" title={topic.name}>
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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap z-20 shadow-xl pointer-events-none">
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
      <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-[#dde3eb]">
        <div className="flex items-center gap-1 text-[10px] text-[#5a6578]">
          <Info size={10} />
          <span>Color scale:</span>
        </div>
        {[
          { label: '0-19%', color: 'bg-red-600' },
          { label: '20-39%', color: 'bg-red-400' },
          { label: '40-54%', color: 'bg-orange-400' },
          { label: '55-69%', color: 'bg-rose-300' },
          { label: '70-84%', color: 'bg-emerald-300' },
          { label: '85-100%', color: 'bg-emerald-500' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="text-[10px] text-[#5a6578]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasteryHeatmap;
