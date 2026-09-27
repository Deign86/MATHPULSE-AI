import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { AssessmentHistoryEntry } from '../../types/models';

interface AssessmentHistoryChartProps {
  history: AssessmentHistoryEntry[];
}

const AssessmentHistoryChart: React.FC<AssessmentHistoryChartProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Complete more assessments to see your progress history.</p>
      </div>
    );
  }

  const data = history.map((entry) => ({
    date: new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: entry.percentage,
    level: entry.proficiencyLevel,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, fill: '#0284c7' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AssessmentHistoryChart;
