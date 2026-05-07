import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { VideoResult } from '../../services/lessonService';

interface VideoLessonSectionProps {
  videos: VideoResult[];
  topic: string;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
      <div className="relative w-full aspect-video bg-slate-800 animate-pulse" />
      <div className="px-4 py-3 bg-slate-800 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

export const VideoLessonSection: React.FC<VideoLessonSectionProps> = ({
  videos,
  topic,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!videos || videos.length === 0) {
    return <LoadingSkeleton />;
  }

  const mainVideo = videos[selectedIndex];
  const alternateVideos = videos.filter((_, i) => i !== selectedIndex);

  return (
    <div className="space-y-4">
      {/* Main video embed */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mainVideo.videoId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl overflow-hidden bg-slate-900 shadow-lg"
        >
          <div className="relative w-full aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${mainVideo.videoId}?rel=0&modestbranding=1`}
              title={mainVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
          <div className="px-4 py-3 bg-slate-800">
            <p className="text-slate-200 text-sm font-medium truncate">
              {mainVideo.title}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              {mainVideo.channelTitle}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Alternate video suggestions */}
      {alternateVideos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            More videos
          </p>
          <div className="grid grid-cols-2 gap-3">
            {alternateVideos.slice(0, 2).map((video) => {
              const actualIndex = videos.findIndex((v) => v.videoId === video.videoId);
              return (
                <button
                  key={video.videoId}
                  onClick={() => setSelectedIndex(actualIndex)}
                  className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all duration-200 bg-white"
                >
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <Play size={14} className="text-rose-500 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-slate-700 text-xs font-medium line-clamp-2 leading-snug">
                      {video.title}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5 truncate">
                      {video.channelTitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLessonSection;
