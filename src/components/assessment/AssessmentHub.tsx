import { BarChart3, ClipboardList, History, Play, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

export type AssessmentHubStatus = 'loading' | 'unassessed' | 'assessed';

interface AssessmentHubProps {
  status: AssessmentHubStatus;
  onStartAssessment: () => void;
  onViewResults: () => void;
  onViewBreakdown: () => void;
}

/** Issue #151: state-driven /assessment landing — never "Content Coming Soon". */
const AssessmentHub: React.FC<AssessmentHubProps> = ({
  status,
  onStartAssessment,
  onViewResults,
  onViewBreakdown,
}) => {
  if (status === 'loading') {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
        aria-busy="true"
        aria-label="Loading assessment status"
        data-testid="assessment-hub-loading"
      >
        <div className="w-10 h-10 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
        <div className="w-56 h-5 rounded-lg bg-slate-200 animate-pulse" />
        <div className="w-40 h-4 rounded-lg bg-slate-200/70 animate-pulse" />
      </div>
    );
  }

  if (status === 'unassessed') {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8" data-testid="assessment-hub-start-card">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="text-violet-600" size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Diagnostic Assessment</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Discover your strengths and growth areas across SHS math topics. Your results shape a
            personalized learning path built just for you.
          </p>
          <Button
            onClick={onStartAssessment}
            data-testid="assessment-hub-start"
            className="w-full py-3 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Start Initial Assessment
          </Button>
          <p className="text-xs text-slate-400 mt-4">About 10 minutes &middot; question by question &middot; auto-saved</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8" data-testid="assessment-hub-results-card">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <BarChart3 className="text-emerald-600" size={32} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Assessment Complete</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Review your latest score, competency breakdown, and full attempt history — or retake the
          diagnostic to track your growth.
        </p>
        <div className="space-y-3">
          <Button
            onClick={onViewResults}
            data-testid="assessment-hub-results"
            className="w-full py-3 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2"
          >
            <History size={16} />
            View results &amp; history
          </Button>
          <Button
            onClick={onViewBreakdown}
            data-testid="assessment-hub-breakdown"
            variant="outline"
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <BarChart3 size={16} />
            Diagnostic breakdown
          </Button>
          <Button
            onClick={onStartAssessment}
            data-testid="assessment-hub-retake"
            variant="ghost"
            className="w-full py-2.5 rounded-xl font-semibold text-slate-500 flex items-center justify-center gap-2"
          >
            <RotateCcw size={15} />
            Retake assessment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentHub;
