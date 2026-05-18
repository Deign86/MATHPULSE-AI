import { useState, useEffect } from 'react';
import type { VideoResult } from '../services/lessonService';
import { fetchYouTubeVideos } from '../services/lessonService';

interface UseInterventionVideosResult {
  videos: VideoResult[];
  isLoading: boolean;
  error: string | null;
}

export function useInterventionVideos(
  youtubeQuery: string | undefined,
  enabled: boolean = true
): UseInterventionVideosResult {
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!youtubeQuery || !enabled) {
      setVideos([]);
      return;
    }
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    fetchYouTubeVideos(youtubeQuery)
      .then((results) => { if (!cancelled) setVideos(results); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [youtubeQuery, enabled]);

  return { videos, isLoading, error };
}
