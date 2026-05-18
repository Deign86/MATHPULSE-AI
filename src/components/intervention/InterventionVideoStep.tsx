import React from 'react';
import { VideoLessonSection } from '../notebook/VideoLessonSection';
import { useInterventionVideos } from '../../hooks/useInterventionVideos';
import type { LearningStep } from '../../services/interventionService';

interface Props {
  step: LearningStep;
  isActive: boolean;
}

export const InterventionVideoStep: React.FC<Props> = ({ step, isActive }) => {
  const { videos, isLoading, error } = useInterventionVideos(
    step.youtube_query || `${step.topic} math tutorial Philippines`,
    isActive
  );

  if (!isActive) return null;

  return (
    <div className="mt-4">
      {error && (
        <p className="text-xs text-red-400 mb-2">Could not load videos: {error}</p>
      )}
      <VideoLessonSection videos={isLoading ? [] : videos} topic={step.title} />
    </div>
  );
};
