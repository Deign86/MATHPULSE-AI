import React from 'react';
import { BookOpen } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { CurriculumSource } from '../types/curriculum';

interface CurriculumSourceBadgeProps {
  sources?: CurriculumSource[];
  className?: string;
}

function abbreviateFileName(fileName: string): string {
  const maxLength = 42;
  if (fileName.length <= maxLength) return fileName;
  return `${fileName.slice(0, 18)}...${fileName.slice(-20)}`;
}

const CurriculumSourceBadge: React.FC<CurriculumSourceBadgeProps> = ({ sources = [], className }) => {
  if (!sources.length) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={[
            'bg-[#75D06A]/15 text-[#2E7D32] border-[#75D06A]/40 font-body font-semibold text-[11px] px-2.5 py-1 rounded-full cursor-help',
            className || '',
          ].join(' ')}
          variant="outline"
        >
          <BookOpen size={12} />
          DepEd Aligned
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-sm bg-white border border-[#dde3eb] text-[#0a1628] shadow-lg p-3">
        <p className="text-[11px] font-display font-bold uppercase tracking-wide text-[#5a6578] mb-2">Curriculum Sources</p>
        <div className="space-y-2">
          {sources.slice(0, 5).map((source, index) => (
            <div key={`${source.sourceFile}-${source.page}-${index}`} className="text-xs leading-relaxed">
              <p className="font-semibold text-[#0a1628]">{source.subject} | Q{source.quarter}</p>
              <p className="text-[#5a6578]">{abbreviateFileName(source.sourceFile)} | p.{source.page}</p>
              <p className="text-[#5a6578]">Similarity: {(source.score * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default CurriculumSourceBadge;
